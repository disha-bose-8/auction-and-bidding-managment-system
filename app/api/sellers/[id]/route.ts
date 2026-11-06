import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { BOARD_SQL, rowToAuction, type BoardRow } from "@/lib/auctions";
import { getDetails } from "@/lib/details";

export const dynamic = "force-dynamic";

// GET /api/sellers/:id -> public seller profile: ratings and reviews (MySQL), their auctions with photos (MySQL + MongoDB)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sellerId = Number((await params).id);
  if (!Number.isInteger(sellerId)) return NextResponse.json({ error: "Invalid seller" }, { status: 400 });

  try {
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT UserID, Name, RegisteredOn FROM Users WHERE UserID = ? AND Role = 'Seller'",
      [sellerId]
    );
    if (!users[0]) return NextResponse.json({ error: "Seller not found" }, { status: 404 });

    // aggregate functions
    const [ratingRows] = await pool.query<RowDataPacket[]>(
      "SELECT ROUND(AVG(Rating), 1) AS avgRating, COUNT(*) AS reviewCount FROM Feedback WHERE ToUserID = ?",
      [sellerId]
    );
    const [soldRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS itemsSold FROM Payments p JOIN Auctions a ON a.AuctionID = p.AuctionID WHERE a.SellerID = ?`,
      [sellerId]
    );

    const rating = ratingRows[0];
    const sold = soldRows[0];

    // this seller's auctions, from the AuctionBoard view
    const [board] = await pool.query<BoardRow[]>(`${BOARD_SQL} WHERE b.SellerID = ? ORDER BY b.EndTime DESC`, [sellerId]);
    const details = await getDetails(board.map((r) => r.AuctionID));
    const auctions = board.map((r) => {
      const a = rowToAuction(r, [], details.get(r.AuctionID));
      return { id: a.id, itemName: a.itemName, status: a.status, price: a.currentPrice ?? a.startingPrice, image: a.image, endTime: a.endTime };
    });

    // reviews: three tables joined
    const [reviews] = await pool.query<RowDataPacket[]>(
      `SELECT f.Rating, f.Comment, f.FeedbackDate, u.Name AS FromName, a.ItemName
         FROM Feedback f
         JOIN Users u    ON u.UserID = f.FromUserID
         JOIN Auctions a ON a.AuctionID = f.AuctionID
        WHERE f.ToUserID = ?
        ORDER BY f.FeedbackDate DESC
        LIMIT 20`,
      [sellerId]
    );

    return NextResponse.json({
      id: users[0].UserID,
      name: users[0].Name,
      memberSince: new Date(users[0].RegisteredOn).toISOString(),
      rating: rating.avgRating ?? null,
      reviewCount: rating.reviewCount,
      itemsSold: sold.itemsSold,
      auctions,
      reviews: reviews.map((r) => ({
        rating: r.Rating, comment: r.Comment, from: r.FromName, item: r.ItemName,
        date: new Date(r.FeedbackDate).toISOString(),
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load the seller" }, { status: 500 });
  }
}
