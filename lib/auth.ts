import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "session";

function getSecret() {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export type Role = "Bidder" | "Seller" | "Admin";
export type Session = { userId: number; role: Role; name: string };

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain: string, hash: string) =>
  bcrypt.compare(plain, hash);

export async function createSession(user: {
  UserID: number;
  Role: Role;
  Name: string;
}) {
  const token = await new SignJWT({
    userId: user.UserID,
    role: user.Role,
    name: user.Name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("2h")
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as Session;
  } catch {
    return null; // expired or tampered
  }
}

// Use at the top of any protected API route.
export async function requireRole(...roles: Role[]) {
  const session = await getSession();
  if (!session) return { error: "Please log in", status: 401 } as const;
  if (!roles.includes(session.role))
    return { error: "Not allowed", status: 403 } as const;
  return { session } as const;
}