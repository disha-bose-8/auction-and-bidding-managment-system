import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";

export const dynamic = "force-dynamic";

// GET /api/notifications -> latest notifications of the logged-in user (MongoDB)
export async function GET() {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  return NextResponse.json(await listNotifications(s.userId));
}
