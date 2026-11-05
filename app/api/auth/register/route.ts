import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2";
import { pool } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phone = String(body.phone ?? "").replace(/\s+/g, "");
  const password = String(body.password ?? "");
  const role = String(body.role ?? "Bidder");

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: "Please enter your full name" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
    return NextResponse.json({ error: "Please enter a valid email" }, { status: 400 });
  }
  if (phone && !/^\+?\d{7,14}$/.test(phone)) {
    return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 });
  }
  if (password.length < 8 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.json(
      { error: "Password needs 8+ characters with a number and a symbol" },
      { status: 400 }
    );
  }
  // public sign-up can never create an Admin
  if (role !== "Bidder" && role !== "Seller") {
    return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
  }

  try {
    const hash = await hashPassword(password);
    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO Users (Name, Email, Phone, PasswordHash, Role) VALUES (?, ?, ?, ?, ?)",
      [name, email, phone || null, hash, role]
    );
    const user = { UserID: result.insertId, Name: name, Role: role as "Bidder" | "Seller" };
    await createSession(user);
    return NextResponse.json(
      { user: { id: user.UserID, name, email, role } },
      { status: 201 }
    );
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}