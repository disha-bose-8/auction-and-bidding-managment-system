import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireRole("Bidder", "Seller");
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { amount } = await req.json();
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    return NextResponse.json({ error: "Invalid bid amount" }, { status: 400 });
  }

  const conn = await pool.getConnection(); // OUT params need the same connection
  try {
    await conn.query("CALL place_bid(?, ?, ?, @prev, @ext)", [
      Number(id),
      auth.session.userId,
      value,
    ]);
    const [rows]: any = await conn.query("SELECT @prev AS prev, @ext AS ext");

    // TODO (Mongo step): if rows[0].prev, insert an "outbid" notification for that user
    return NextResponse.json({
      ok: true,
      extended: !!rows[0].ext,
      previousBidder: rows[0].prev,
    });
  } catch (err: any) {
    // our trigger errors (SQLSTATE 45000) are user-facing validation messages
    if (err.sqlState === "45000") {
      return NextResponse.json({ error: err.sqlMessage }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    conn.release();
  }
}