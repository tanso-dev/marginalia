import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const payload = await getUser();
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
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      createdAt: user.created_at,
    },
  });
}
