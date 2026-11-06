import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { pool } from "@/lib/db";
import { BOARD_SQL, rowToAuction, type BoardRow } from "@/lib/auctions";
import { getDetails, saveDetails } from "@/lib/details";
import { requireRole } from "@/lib/auth";

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

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

// POST /api/auctions  (Seller only)
// MySQL gets the auction row (price, times, category, seller). MongoDB gets the free-form part (image, specs, tags).
export async function POST(req: Request) {
  const auth = await requireRole("Seller");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  if (!body) return bad("Invalid request");

  const itemName = String(body.itemName ?? "").trim();
  const description = String(body.description ?? "").trim();
  const categoryId = Number(body.categoryId);
  const startingPrice = Number(body.startingPrice);
  const reservePrice =
    body.reservePrice === "" || body.reservePrice == null ? null : Number(body.reservePrice);
  const now = new Date();
  const start = body.startTime ? new Date(body.startTime) : now;
  const end = new Date(body.endTime);

  if (itemName.length < 2 || itemName.length > 100) return bad("Item name must be 2 to 100 characters");
  if (description.length > 500) return bad("Description can be at most 500 characters");
  if (!Number.isInteger(categoryId) || categoryId <= 0) return bad("Please choose a category");
  if (!Number.isFinite(startingPrice) || startingPrice <= 0 || startingPrice > 10000000)
    return bad("Starting price must be more than 0");
  if (reservePrice !== null && (!Number.isFinite(reservePrice) || reservePrice < startingPrice))
    return bad("Reserve price cannot be lower than the starting price");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return bad("Please pick valid start and end times");
  if (end <= start) return bad("End time must be after the start time");
  if (end <= now) return bad("End time must be in the future");

  // MongoDB part: clean up what the seller typed
  const specifications: Record<string, string> = {};
  for (const [k, v] of Object.entries((body.specifications ?? {}) as Record<string, unknown>).slice(0, 12)) {
    const key = String(k).trim().slice(0, 40);
    const val = String(v ?? "").trim().slice(0, 100);
    if (key && val) specifications[key] = val;
  }
  const tags: string[] = (Array.isArray(body.tags) ? body.tags : [])
    .map((t: unknown) => String(t).trim().toLowerCase().slice(0, 30))
    .filter(Boolean)
    .slice(0, 10);
  const imageUrl = String(body.imageUrl ?? "").trim();
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return bad("Image link must start with http:// or https://");

  try {
    const [res] = await pool.query<ResultSetHeader>(
      `INSERT INTO Auctions (ItemName, Description, CategoryID, SellerID, StartingPrice, ReservePrice, StartTime, EndTime, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [itemName, description || null, categoryId, auth.session.userId, startingPrice, reservePrice, start, end]
    );
    const id = res.insertId;

    // flips it to Live right away if the start time has already come
    await pool.query("CALL sync_auction_status()").catch((e) => console.error(e));

    let detailsSaved = true;
    try {
      await saveDetails({ auctionId: id, images: imageUrl ? [imageUrl] : [], specifications, tags });
    } catch (e) {
      // the auction exists in MySQL either way; the page just shows no specs
      console.error("Could not save details to MongoDB:", (e as Error).message);
      detailsSaved = false;
    }
    return NextResponse.json({ id, detailsSaved }, { status: 201 });
  } catch (err: any) {
    if (err.code === "ER_NO_REFERENCED_ROW_2") return bad("That category does not exist");
    if (err.sqlState === "45000") return bad(err.sqlMessage);
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
