-- =====================================================================
--  ONLINE AUCTION AND BIDDING MANAGEMENT SYSTEM  (MySQL 8.x)
--  Complete script: DDL + DML + advanced features + demo queries
--
--  HOW TO RUN (mysql command-line client):
--      mysql -u root -p < auction_full_script.sql
--  or inside the client:
--      mysql> SOURCE /full/path/to/auction_full_script.sql;
--
--  WARNING: Part 0 drops and recreates the database, so any existing
--  data in auction_bidding_system is lost.
--
--  ORDER MATTERS: sample data (Part 2) is loaded BEFORE the trigger
--  (Part 3), because the trigger would reject the sample bids on
--  auctions that are already Closed.
-- =====================================================================


-- =====================================================================
-- PART 0: DATABASE
-- =====================================================================
DROP DATABASE IF EXISTS auction_bidding_system;
CREATE DATABASE auction_bidding_system;
USE auction_bidding_system;


-- =====================================================================
-- PART 1: DDL  (tables, primary keys, foreign keys, constraints)
-- Parent tables first, child tables after.
-- =====================================================================

CREATE TABLE Users (
    UserID       INT AUTO_INCREMENT PRIMARY KEY,
    Name         VARCHAR(100) NOT NULL,
    Email        VARCHAR(100) NOT NULL UNIQUE,
    Phone        VARCHAR(15),
    PasswordHash VARCHAR(255) NOT NULL,
    Role         VARCHAR(10) NOT NULL CHECK (Role IN ('Bidder','Seller','Admin')),
    RegisteredOn DATE NOT NULL DEFAULT (CURRENT_DATE)
);

CREATE TABLE Categories (
    CategoryID   INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(50) NOT NULL UNIQUE,
    Description  VARCHAR(255)
);

CREATE TABLE Auctions (
    AuctionID     INT AUTO_INCREMENT PRIMARY KEY,
    ItemName      VARCHAR(100) NOT NULL,
    Description   VARCHAR(500),
    CategoryID    INT NOT NULL,
    SellerID      INT NOT NULL,
    StartingPrice DECIMAL(10,2) NOT NULL CHECK (StartingPrice > 0),
    ReservePrice  DECIMAL(10,2),
    StartTime     DATETIME NOT NULL,
    EndTime       DATETIME NOT NULL,
    Status        VARCHAR(10) NOT NULL DEFAULT 'Scheduled'
                  CHECK (Status IN ('Scheduled','Live','Closed','Cancelled')),
    CHECK (EndTime > StartTime),
    FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID),
    FOREIGN KEY (SellerID)   REFERENCES Users(UserID)
);

CREATE TABLE Bids (
    BidID     INT AUTO_INCREMENT PRIMARY KEY,
    AuctionID INT NOT NULL,
    BidderID  INT NOT NULL,
    BidAmount DECIMAL(10,2) NOT NULL CHECK (BidAmount > 0),
    BidTime   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AuctionID) REFERENCES Auctions(AuctionID),
    FOREIGN KEY (BidderID)  REFERENCES Users(UserID)
);

CREATE TABLE Payments (
    PaymentID     INT AUTO_INCREMENT PRIMARY KEY,
    AuctionID     INT NOT NULL UNIQUE,
    BuyerID       INT NOT NULL,
    Amount        DECIMAL(10,2) NOT NULL CHECK (Amount > 0),
    PaymentDate   DATETIME,
    PaymentStatus VARCHAR(10) NOT NULL DEFAULT 'Pending'
                  CHECK (PaymentStatus IN ('Pending','Completed','Failed')),
    FOREIGN KEY (AuctionID) REFERENCES Auctions(AuctionID),
    FOREIGN KEY (BuyerID)   REFERENCES Users(UserID)
);

CREATE TABLE Watchlist (
    WatchID   INT AUTO_INCREMENT PRIMARY KEY,
    UserID    INT NOT NULL,
    AuctionID INT NOT NULL,
    FOREIGN KEY (UserID)    REFERENCES Users(UserID),
    FOREIGN KEY (AuctionID) REFERENCES Auctions(AuctionID),
    UNIQUE (UserID, AuctionID)
);

CREATE TABLE Feedback (
    FeedbackID   INT AUTO_INCREMENT PRIMARY KEY,
    AuctionID    INT NOT NULL,
    FromUserID   INT NOT NULL,
    ToUserID     INT NOT NULL,
    Rating       INT NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Comment      VARCHAR(500),
    FeedbackDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AuctionID)  REFERENCES Auctions(AuctionID),
    FOREIGN KEY (FromUserID) REFERENCES Users(UserID),
    FOREIGN KEY (ToUserID)   REFERENCES Users(UserID)
);


-- =====================================================================
-- PART 2: DML  (INSERT, UPDATE, DELETE)
-- NOTE: IDs are assigned 1,2,3... in insert order; later rows refer to
-- them by number (e.g. SellerID = 2 means Meera Nair).
-- PasswordHash values are placeholders for test data only. The web app
-- must store real bcrypt hashes.
-- =====================================================================

-- ---------- INSERT ----------
INSERT INTO Users (Name, Email, Phone, PasswordHash, Role) VALUES
('Aarav Sharma',  'aarav@mail.com',   '9876500001', 'hash_aarav',   'Admin'),
('Meera Nair',    'meera@mail.com',   '9876500002', 'hash_meera',   'Seller'),
('Rohan Gupta',   'rohan@mail.com',   '9876500003', 'hash_rohan',   'Seller'),
('Sneha Reddy',   'sneha@mail.com',   '9876500004', 'hash_sneha',   'Bidder'),
('Karthik Iyer',  'karthik@mail.com', '9876500005', 'hash_karthik', 'Bidder'),
('Divya Menon',   'divya@mail.com',   '9876500006', 'hash_divya',   'Bidder');

INSERT INTO Categories (CategoryName, Description) VALUES
('Electronics', 'Phones, laptops, gadgets'),
('Antiques',    'Vintage and collectible items'),
('Art',         'Paintings and sculptures'),
('Fashion',     'Watches, jewellery, apparel');

INSERT INTO Auctions (ItemName, Description, CategoryID, SellerID, StartingPrice, ReservePrice, StartTime, EndTime, Status) VALUES
('iPhone 14 Pro',       '256GB, like new',      1, 2, 40000.00, 55000.00, '2026-09-01 10:00:00', '2026-09-05 10:00:00', 'Closed'),
('Vintage Brass Clock', '1950s wall clock',     2, 3,  5000.00,  8000.00, '2026-09-10 09:00:00', '2026-09-20 21:00:00', 'Live'),
('Oil Painting - Dusk', 'Original, 24x36 inch', 3, 2, 15000.00, 20000.00, '2026-09-12 12:00:00', '2026-09-25 12:00:00', 'Live'),
('Titan Edge Watch',    'Slim, unused',         4, 3,  8000.00, 10000.00, '2026-10-01 10:00:00', '2026-10-08 10:00:00', 'Scheduled'),
('Gaming Laptop',       'RTX 4060, 16GB RAM',   1, 2, 60000.00, 75000.00, '2026-08-20 10:00:00', '2026-08-27 10:00:00', 'Cancelled');

INSERT INTO Bids (AuctionID, BidderID, BidAmount, BidTime) VALUES
(1, 4, 42000.00, '2026-09-01 11:00:00'),
(1, 5, 48000.00, '2026-09-02 15:30:00'),
(1, 4, 56000.00, '2026-09-04 18:45:00'),
(2, 5,  5500.00, '2026-09-11 10:15:00'),
(2, 6,  6200.00, '2026-09-12 20:00:00'),
(3, 6, 16000.00, '2026-09-13 09:30:00'),
(3, 4, 17500.00, '2026-09-14 14:10:00');

INSERT INTO Payments (AuctionID, BuyerID, Amount, PaymentDate, PaymentStatus) VALUES
(1, 4, 56000.00, '2026-09-06 12:00:00', 'Completed');

INSERT INTO Watchlist (UserID, AuctionID) VALUES
(4, 2), (5, 3), (6, 4), (6, 3);

INSERT INTO Feedback (AuctionID, FromUserID, ToUserID, Rating, Comment) VALUES
(1, 4, 2, 5, 'Smooth deal, item as described'),
(1, 2, 4, 5, 'Prompt payment');

-- ---------- UPDATE ----------
UPDATE Auctions SET Status = 'Closed' WHERE AuctionID = 2;
UPDATE Users    SET Phone = '9999900000' WHERE UserID = 6;
UPDATE Payments SET PaymentStatus = 'Completed' WHERE AuctionID = 1;

-- ---------- DELETE ----------
DELETE FROM Watchlist WHERE UserID = 6 AND AuctionID = 4;


-- =====================================================================
-- PART 3: ADVANCED FEATURES
-- =====================================================================

-- ---------- 3.1 ALTER TABLE ----------
ALTER TABLE Users ADD COLUMN IsActive BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------- 3.2 INDEXES ----------
CREATE INDEX idx_bids_auction_amount ON Bids (AuctionID, BidAmount);
CREATE INDEX idx_auctions_status_end ON Auctions (Status, EndTime);

-- ---------- 3.3 FULL-TEXT SEARCH INDEX (also an ALTER TABLE) ----------
ALTER TABLE Auctions ADD FULLTEXT idx_auction_search (ItemName, Description);

-- ---------- 3.4 VIEW ----------
CREATE VIEW CurrentHighestBid AS
SELECT AuctionID, MAX(BidAmount) AS HighestBid, COUNT(*) AS TotalBids
FROM Bids
GROUP BY AuctionID;

-- ---------- 3.5 TRIGGER (validates every new bid) ----------
DROP TRIGGER IF EXISTS trg_validate_bid;

DELIMITER //
CREATE TRIGGER trg_validate_bid
BEFORE INSERT ON Bids
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(10);
    DECLARE v_start  DECIMAL(10,2);
    DECLARE v_seller INT;
    DECLARE v_high   DECIMAL(10,2);

    SELECT Status, StartingPrice, SellerID
      INTO v_status, v_start, v_seller
      FROM Auctions WHERE AuctionID = NEW.AuctionID;

    IF v_status <> 'Live' THEN
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

-- ---------- 3.6 STORED PROCEDURE + TRANSACTION ----------
-- Locks the auction row (FOR UPDATE) so two simultaneous bids cannot
-- both pass validation against the same old highest bid.
DROP PROCEDURE IF EXISTS place_bid;

DELIMITER //
CREATE PROCEDURE place_bid(IN p_auction INT, IN p_bidder INT, IN p_amount DECIMAL(10,2))
BEGIN
    DECLARE v_lock INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    SELECT AuctionID INTO v_lock FROM Auctions WHERE AuctionID = p_auction FOR UPDATE;
    INSERT INTO Bids (AuctionID, BidderID, BidAmount) VALUES (p_auction, p_bidder, p_amount);
    COMMIT;
END//
DELIMITER ;


-- =====================================================================
-- PART 4: SELECT QUERIES (JOIN, GROUP BY, aggregates, ORDER BY)
-- =====================================================================

SELECT * FROM Users;

SELECT AuctionID, ItemName, StartingPrice, Status FROM Auctions;

-- highest bid per auction
SELECT AuctionID, MAX(BidAmount) AS HighestBid FROM Bids GROUP BY AuctionID;

-- bids with bidder and item names (2 joins)
SELECT a.ItemName, u.Name AS Bidder, b.BidAmount, b.BidTime
FROM Bids b
JOIN Auctions a ON b.AuctionID = a.AuctionID
JOIN Users u    ON b.BidderID  = u.UserID
ORDER BY a.ItemName, b.BidAmount DESC;

-- auctions with seller and category (2 joins)
SELECT a.ItemName, c.CategoryName, u.Name AS Seller, a.Status
FROM Auctions a
JOIN Categories c ON a.CategoryID = c.CategoryID
JOIN Users u      ON a.SellerID   = u.UserID;

-- HAVING: auctions with more than one bid
SELECT AuctionID, COUNT(*) AS NumBids
FROM Bids
GROUP BY AuctionID
HAVING COUNT(*) > 1;

-- subquery: auctions whose highest bid reached the reserve price
SELECT ItemName, ReservePrice
FROM Auctions
WHERE ReservePrice <= (SELECT MAX(BidAmount) FROM Bids WHERE Bids.AuctionID = Auctions.AuctionID);

-- average seller rating (aggregate + join)
SELECT u.Name AS Seller, AVG(f.Rating) AS AvgRating
FROM Feedback f
JOIN Users u ON f.ToUserID = u.UserID
GROUP BY u.Name;


-- =====================================================================
-- PART 5: REVIEW DEMO  (run these one at a time during the review)
-- =====================================================================

-- 5.1 Indexes
SHOW INDEX FROM Bids;
SHOW INDEX FROM Auctions;
EXPLAIN SELECT MAX(BidAmount) FROM Bids WHERE AuctionID = 3;

-- 5.2 View
SELECT * FROM CurrentHighestBid;

-- 5.3 Full-text search (try 'clock', 'painting' or 'watch'; words under
--     3 characters are ignored by MySQL)
SELECT ItemName, Description FROM Auctions
WHERE MATCH(ItemName, Description) AGAINST ('clock' IN NATURAL LANGUAGE MODE);

-- 5.4 Trigger and procedure objects exist
SHOW TRIGGERS;
SHOW PROCEDURE STATUS WHERE Db = DATABASE();

-- 5.5 Trigger: these inserts are EXPECTED TO FAIL (run each separately;
--     they are commented out so the whole file runs without stopping on
--     an error. Remove the leading -- to demo them.)
-- INSERT INTO Bids (AuctionID, BidderID, BidAmount) VALUES (3, 5, 17000);   -- Bid must exceed current highest bid
-- INSERT INTO Bids (AuctionID, BidderID, BidAmount) VALUES (3, 2, 25000);   -- Seller cannot bid on own auction
-- INSERT INTO Bids (AuctionID, BidderID, BidAmount) VALUES (1, 5, 60000);   -- Auction is not live

-- 5.6 Procedure + transaction (succeeds; running the SAME call twice
--     fails the second time, because the amount must keep increasing)
-- CALL place_bid(3, 5, 18000.00);
-- SELECT * FROM CurrentHighestBid;      -- auction 3 now shows 18000 and 3 bids
-- CALL place_bid(3, 5, 18000.00);       -- fails: Bid must exceed current highest bid

-- =====================================================================
-- END OF SCRIPT
-- =====================================================================
