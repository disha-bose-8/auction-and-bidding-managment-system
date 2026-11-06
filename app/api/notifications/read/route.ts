import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications";

// POST /api/notifications/read -> mark everything as read
export async function POST() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  try {
    await markAllRead(s.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
