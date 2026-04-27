import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req) {
  const payload = await getUser();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId } = await req.json();
  const db = getDb();

  await db.execute({
    sql: "DELETE FROM chat_messages WHERE user_id = ? AND book_id = ?",
    args: [payload.userId, bookId],
  });
  await db.execute({
    sql: "DELETE FROM chapter_progress WHERE user_id = ? AND book_id = ?",
    args: [payload.userId, bookId],
  });
  await db.execute({
    sql: "DELETE FROM user_books WHERE user_id = ? AND id = ?",
    args: [payload.userId, bookId],
  });

  return NextResponse.json({ ok: true });
}
