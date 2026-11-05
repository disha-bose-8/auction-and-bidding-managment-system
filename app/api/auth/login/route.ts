import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { verifyPassword, createSession, type Role } from "@/lib/auth";

interface UserRow extends RowDataPacket {
  UserID: number;
  Name: string;
  Email: string;
  Role: Role;
  PasswordHash: string;
  IsActive: number;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const [rows] = await pool.query<UserRow[]>(
      "SELECT UserID, Name, Email, Role, PasswordHash, IsActive FROM Users WHERE Email = ?",
      [email]
    );
    const user = rows[0];
    // same message for "no such user" and "wrong password" on purpose
    if (!user || !user.IsActive || !(await verifyPassword(password, user.PasswordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createSession(user);
    return NextResponse.json({
      user: { id: user.UserID, name: user.Name, email: user.Email, role: user.Role },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}