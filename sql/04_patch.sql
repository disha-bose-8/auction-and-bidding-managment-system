-- =====================================================================
--  04_patch.sql  -- run AFTER auction_full_script.sql
--  1. real bcrypt hashes (demo password: Password@123)
--  2. trigger also checks the auction time window
--  3. place_bid returns previous high bidder + anti-sniping flag
--  4. sync_auction_status() + scheduled EVENT (auto start / close / invoice)
--  5. extra constraints, a board view, and fresh demo auctions
-- =====================================================================
USE auction_bidding_system;

-- ---------- 1. real bcrypt hashes (cost 12, same as lib/auth.js) ----------
UPDATE Users
SET PasswordHash = '$2b$12$T5AQymqrcSuu4MjvHNqmBOWgTOe788BJSQNnEGxc2w9YrEMdh3hrq';

-- ---------- 2. trigger: also enforce StartTime/EndTime ----------
DROP TRIGGER IF EXISTS trg_validate_bid;

DELIMITER //
CREATE TRIGGER trg_validate_bid
BEFORE INSERT ON Bids
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(10);
    DECLARE v_start  DECIMAL(10,2);
    DECLARE v_seller INT;
    DECLARE v_from   DATETIME;
    DECLARE v_to     DATETIME;
    DECLARE v_high   DECIMAL(10,2);

    SELECT Status, StartingPrice, SellerID, StartTime, EndTime
      INTO v_status, v_start, v_seller, v_from, v_to
      FROM Auctions WHERE AuctionID = NEW.AuctionID;

    IF v_status <> 'Live' OR NOW() < v_from OR NOW() >= v_to THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Auction is not live';
    END IF;
    IF NEW.BidderID = v_seller THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Seller cannot bid on own auction';
    END IF;
    IF NEW.BidAmount < v_start THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bid is below starting price';
    END IF;

    SELECT IFNULL(MAX(BidAmount), 0) INTO v_high
      FROM Bids WHERE AuctionID = NEW.AuctionID;
    IF NEW.BidAmount <= v_high THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bid must exceed current highest bid';
    END IF;
END//
DELIMITER ;

-- ---------- 3. place_bid with OUT params + anti-sniping ----------
-- p_prev_bidder : who was winning before this bid (NULL if first bid) -> "you were outbid" notification
-- p_extended    : 1 if the bid landed in the last 5 minutes and EndTime was pushed back
DROP PROCEDURE IF EXISTS place_bid;

DELIMITER //
CREATE PROCEDURE place_bid(
    IN  p_auction     INT,
    IN  p_bidder      INT,
    IN  p_amount      DECIMAL(10,2),
    OUT p_prev_bidder INT,
    OUT p_extended    TINYINT
)
BEGIN
    DECLARE v_end DATETIME;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET p_prev_bidder = NULL;
    SET p_extended    = 0;

    START TRANSACTION;

    -- lock the auction row so concurrent bids are serialised
    SELECT EndTime INTO v_end FROM Auctions WHERE AuctionID = p_auction FOR UPDATE;

    SELECT BidderID INTO p_prev_bidder
      FROM Bids WHERE AuctionID = p_auction
      ORDER BY BidAmount DESC LIMIT 1;

    INSERT INTO Bids (AuctionID, BidderID, BidAmount) VALUES (p_auction, p_bidder, p_amount);

    IF TIMESTAMPDIFF(SECOND, NOW(), v_end) < 300 THEN
        UPDATE Auctions SET EndTime = NOW() + INTERVAL 5 MINUTE WHERE AuctionID = p_auction;
        SET p_extended = 1;
    END IF;

    COMMIT;
END//
DELIMITER ;

-- ---------- 4. auto start / close / invoice ----------
DROP PROCEDURE IF EXISTS sync_auction_status;

DELIMITER //
CREATE PROCEDURE sync_auction_status()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Scheduled -> Live
    UPDATE Auctions SET Status = 'Live'
    WHERE Status = 'Scheduled' AND StartTime <= NOW() AND EndTime > NOW();

    -- invoice the winner (only if the reserve price was met)
    INSERT INTO Payments (AuctionID, BuyerID, Amount)
    SELECT a.AuctionID, b.BidderID, b.BidAmount
    FROM Auctions a
    JOIN Bids b ON b.AuctionID = a.AuctionID
    WHERE a.Status = 'Live' AND a.EndTime <= NOW()
      AND b.BidAmount = (SELECT MAX(BidAmount) FROM Bids WHERE AuctionID = a.AuctionID)
      AND (a.ReservePrice IS NULL OR b.BidAmount >= a.ReservePrice);

    -- Live -> Closed
    UPDATE Auctions SET Status = 'Closed'
    WHERE Status = 'Live' AND EndTime <= NOW();

    COMMIT;
END//
DELIMITER ;

-- needs: SET GLOBAL event_scheduler = ON;   (or event_scheduler=ON in my.ini)
DROP EVENT IF EXISTS ev_sync_auctions;
CREATE EVENT ev_sync_auctions
ON SCHEDULE EVERY 1 MINUTE
DO CALL sync_auction_status();

-- ---------- 5. constraints, view, demo data ----------
ALTER TABLE Feedback
    ADD CONSTRAINT chk_feedback_not_self CHECK (FromUserID <> ToUserID),
    ADD CONSTRAINT uq_feedback_once UNIQUE (AuctionID, FromUserID);

CREATE OR REPLACE VIEW AuctionBoard AS
SELECT a.AuctionID, a.ItemName, a.Description, a.StartingPrice, a.ReservePrice,
       a.StartTime, a.EndTime, a.Status,
       c.CategoryID, c.CategoryName,
       u.UserID AS SellerID, u.Name AS SellerName,
       IFNULL(h.HighestBid, a.StartingPrice) AS CurrentPrice,
       IFNULL(h.TotalBids, 0)                AS TotalBids
FROM Auctions a
JOIN Categories c ON c.CategoryID = a.CategoryID
JOIN Users u      ON u.UserID     = a.SellerID
LEFT JOIN CurrentHighestBid h ON h.AuctionID = a.AuctionID;

-- the sample dates in the original script are in the past; make them relative to NOW()
UPDATE Auctions SET Status = 'Live',
       StartTime = NOW() - INTERVAL 1 DAY, EndTime = NOW() + INTERVAL 2 DAY
WHERE AuctionID = 3;
UPDATE Auctions SET Status = 'Scheduled',
       StartTime = NOW() + INTERVAL 1 DAY, EndTime = NOW() + INTERVAL 3 DAY
WHERE AuctionID = 4;

INSERT INTO Auctions (ItemName, Description, CategoryID, SellerID, StartingPrice, ReservePrice, StartTime, EndTime, Status) VALUES
('Sony WH-1000XM5',       'Noise-cancelling headphones', 1, 2, 32000.00, 38000.00, NOW() - INTERVAL 2 HOUR, NOW() + INTERVAL 6 HOUR,  'Live'),
('Royal Doulton Vase',    'Porcelain, 1960s',            2, 3, 12000.00, 15000.00, NOW() - INTERVAL 5 HOUR, NOW() + INTERVAL 18 HOUR, 'Live'),
('Leather Travel Satchel','Hand-stitched, tan',          4, 3,  9500.00, 12000.00, NOW() - INTERVAL 1 HOUR, NOW() + INTERVAL 3 MINUTE,'Live');