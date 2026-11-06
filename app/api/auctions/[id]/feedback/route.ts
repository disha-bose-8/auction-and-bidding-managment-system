import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Only the buyer who won (and has an invoice for) a closed auction may rate its seller, once.
async function checkEligible(auctionId: number, userId: number) {
  const [given] = await pool.query<RowDataPacket[]>(
    "SELECT Rating, Comment FROM Feedback WHERE AuctionID = ? AND FromUserID = ?",
    [auctionId, userId]
  );
  if (given[0]) return { eligible: false, given: { rating: given[0].Rating as number, comment: (given[0].Comment as string | null) ?? null }, sellerId: 0 };

  const [won] = await pool.query<RowDataPacket[]>(
    `SELECT a.SellerID FROM Payments p JOIN Auctions a ON a.AuctionID = p.AuctionID
      WHERE p.AuctionID = ? AND p.BuyerID = ? AND a.Status = 'Closed'`,
    [auctionId, userId]
  );
  return { eligible: !!won[0], given: null, sellerId: (won[0]?.SellerID as number) ?? 0 };
}

// GET /api/auctions/:id/feedback -> can this user rate the seller, or have they already?
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auctionId = Number((await params).id);
  const s = await getSession();
  if (!s || !Number.isInteger(auctionId)) return NextResponse.json({ eligible: false, given: null });
  try {
    const { eligible, given } = await checkEligible(auctionId, s.userId);
    return NextResponse.json({ eligible, given });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ eligible: false, given: null });
  }
}

// POST /api/auctions/:id/feedback  { rating, comment }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auctionId = Number((await params).id);
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  if (!Number.isInteger(auctionId)) return NextResponse.json({ error: "Invalid auction" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment = String(body?.comment ?? "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return NextResponse.json({ error: "Please pick a rating from 1 to 5" }, { status: 400 });
  if (comment.length > 500)
    return NextResponse.json({ error: "Comment can be at most 500 characters" }, { status: 400 });

  try {
    const { eligible, sellerId, given } = await checkEligible(auctionId, s.userId);
    if (given) return NextResponse.json({ error: "You already rated this seller for this auction" }, { status: 409 });
    if (!eligible) return NextResponse.json({ error: "Only the winner of a finished auction can leave feedback" }, { status: 403 });

    await pool.query(
      "INSERT INTO Feedback (AuctionID, FromUserID, ToUserID, Rating, Comment) VALUES (?, ?, ?, ?, ?)",
      [auctionId, s.userId, sellerId, rating, comment || null]
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY")
      return NextResponse.json({ error: "You already rated this seller for this auction" }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
