import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { username, password, displayName } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 });
    }

    const db = getDb();
    const hash = await bcrypt.hash(password, 10);

    try {
      await db.execute({
        sql: "INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)",
        args: [username.toLowerCase().trim(), hash, displayName || username],
      });
    } catch (e) {
      if (e.message?.includes("UNIQUE")) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
      }
      throw e;
    }

    const result = await db.execute({
      sql: "SELECT id, username, display_name FROM users WHERE username = ?",
      args: [username.toLowerCase().trim()],
    });

    const user = result.rows[0];
    const token = await createToken(user.id, user.username);

    const res = NextResponse.json({
      user: { id: user.id, username: user.username, displayName: user.display_name },
    });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("Register error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
