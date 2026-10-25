import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const COOKIE = "session";

export const hashPassword = (plain) => bcrypt.hash(plain, 12);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

export async function createSession(user) {
    const token = await new SignJWT({
        userId: user.UserID,
        role: user.Role,
        name: user.Name,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("2h")
        .sign(secret);

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

export async function getSession() {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload; // { userId, role, name, exp }
    } catch {
        return null; // expired or tampered
    }
}

// Use at the top of any protected API route.
export async function requireRole(...roles) {
    const session = await getSession();
    if (!session) return { error: "Please log in", status: 401 };
    if (!roles.includes(session.role)) return { error: "Not allowed", status: 403 };
    return { session };
}