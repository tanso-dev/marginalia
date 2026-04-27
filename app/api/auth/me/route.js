import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: "SELECT id, username, display_name, created_at FROM users WHERE id = ?",
      args: [payload.userId],
    });

    const user = result.rows[0];
    if (!user) return NextResponse.json({ user: null }, { status: 401 });

    return NextResponse.json({
      user: {
        id: Number(user.id),
        username: user.username,
        displayName: user.display_name,
        createdAt: user.created_at,
      },
    });
  } catch (e) {
    console.error("Auth me error:", e);
    return NextResponse.json({ user: null, error: "Server error" }, { status: 500 });
  }
}
