import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/categories -> list for the "Create auction" dropdown
export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT CategoryID, CategoryName FROM Categories ORDER BY CategoryName"
    );
    return NextResponse.json(
      rows.map((r) => ({ id: r.CategoryID as number, name: r.CategoryName as string }))
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load categories" }, { status: 500 });
  }
}
