import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/watchlist -> ids of the auctions the logged-in user is watching
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT AuctionID FROM Watchlist WHERE UserID = ?",
    [s.userId]
  );
  return NextResponse.json({ ids: rows.map((r) => r.AuctionID as number) });
}

// POST /api/watchlist  { auctionId } -> adds it, or removes it if it is already there
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please log in" }, { status: 401 });

  const { auctionId } = await req.json();
  const id = Number(auctionId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid auction" }, { status: 400 });
  }

  try {
    const [del]: any = await pool.query(
      "DELETE FROM Watchlist WHERE UserID = ? AND AuctionID = ?",
      [s.userId, id]
    );
    if (del.affectedRows > 0) {
      return NextResponse.json({ watching: false });
    }
    await pool.query("INSERT INTO Watchlist (UserID, AuctionID) VALUES (?, ?)", [
      s.userId,
      id,
    ]);
    return NextResponse.json({ watching: true });
  } catch (err: any) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
