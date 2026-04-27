import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId } = await req.json();
  const db = getDb();

  // Remove user's personal data for this book
  await db.execute({
    sql: "DELETE FROM chat_messages WHERE user_id = ? AND catalog_id = ?",
    args: [payload.userId, bookId],
  });
  await db.execute({
    sql: "DELETE FROM chapter_progress WHERE user_id = ? AND catalog_id = ?",
    args: [payload.userId, bookId],
  });
  await db.execute({
    sql: "DELETE FROM user_books WHERE user_id = ? AND catalog_id = ?",
    args: [payload.userId, bookId],
  });
  // Note: book_catalog and chapter_reflections are NOT deleted — they're shared

  return NextResponse.json({ ok: true });
}
