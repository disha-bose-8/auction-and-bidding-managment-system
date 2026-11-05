import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { BOARD_SQL, rowToAuction, type BoardRow } from "@/lib/auctions";
import { getDetails } from "@/lib/details";

export const dynamic = "force-dynamic";

interface BidRow extends RowDataPacket {
  BidID: number;
  BidderID: number;
  Name: string;
  BidAmount: number;
  BidTime: Date;
}

// GET /api/auctions/:id  -> one auction (MySQL) with its bid history + specs (MongoDB)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auctionId = Number(id);
  if (!Number.isInteger(auctionId)) {
    return NextResponse.json({ error: "Invalid auction id" }, { status: 400 });
  }

  try {
    await pool.query("CALL sync_auction_status()").catch((e) => console.error(e));

    const [rows] = await pool.query<BoardRow[]>(`${BOARD_SQL} WHERE b.AuctionID = ?`, [auctionId]);
    if (!rows[0]) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    const [bidRows] = await pool.query<BidRow[]>(
      `SELECT b.BidID, b.BidderID, u.Name, b.BidAmount, b.BidTime
         FROM Bids b JOIN Users u ON u.UserID = b.BidderID
        WHERE b.AuctionID = ?
        ORDER BY b.BidAmount ASC`,
      [auctionId]
    );
    const bids = bidRows.map((b) => ({
      id: b.BidID,
      auctionId,
      bidderId: b.BidderID,
      bidderName: b.Name,
      amount: b.BidAmount,
      time: new Date(b.BidTime).toISOString(),
    }));

    const details = await getDetails([auctionId]);
    return NextResponse.json(rowToAuction(rows[0], bids, details.get(auctionId)));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load auction" }, { status: 500 });
  }
}