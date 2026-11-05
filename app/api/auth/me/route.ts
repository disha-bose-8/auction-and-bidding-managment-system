import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// Who is logged in? Returns { user: null } if nobody.
export async function GET() {
  const s = await getSession();
  return NextResponse.json({
    user: s ? { id: s.userId, name: s.name, role: s.role } : null,
  });
}