import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { BOARD_SQL, rowToAuction, type BoardRow } from "@/lib/auctions";
import { getDetails } from "@/lib/details";

export const dynamic = "force-dynamic";

// GET /api/auctions  -> every auction (MySQL) + its images/specs (MongoDB)
export async function GET() {
  try {
    // start scheduled auctions / close finished ones (also runs every minute via the MySQL event)
    await pool.query("CALL sync_auction_status()").catch((e) => console.error(e));

    const [rows] = await pool.query<BoardRow[]>(`${BOARD_SQL} ORDER BY b.EndTime ASC`);
    const details = await getDetails(rows.map((r) => r.AuctionID));
    return NextResponse.json(rows.map((r) => rowToAuction(r, [], details.get(r.AuctionID))));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load auctions" }, { status: 500 });
  }
}