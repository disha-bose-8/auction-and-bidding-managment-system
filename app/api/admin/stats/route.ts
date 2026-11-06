import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAdminStats } from "@/lib/admin";

export const dynamic = "force-dynamic";

// GET /api/admin/stats  (Admin only) -> numbers for the dashboard
export async function GET() {
  const auth = await requireRole("Admin");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    return NextResponse.json(await getAdminStats());
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load the dashboard" }, { status: 500 });
  }
}
