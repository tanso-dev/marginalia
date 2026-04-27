import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function POST(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, chapterNumber, completed } = await req.json();
  const db = getDb();

  if (completed) {
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO chapter_progress (user_id, book_id, chapter_number) VALUES (?, ?, ?)",
        args: [payload.userId, bookId, chapterNumber],
      });
    } catch (e) {
      // Already exists, that's fine
    }
  } else {
    await db.execute({
      sql: "DELETE FROM chapter_progress WHERE user_id = ? AND book_id = ? AND chapter_number = ?",
      args: [payload.userId, bookId, chapterNumber],
    });
  }

  const progress = await db.execute({
    sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND book_id = ?",
    args: [payload.userId, bookId],
  });

  return NextResponse.json({
    chaptersRead: progress.rows.map((r) => r.chapter_number),
  });
}
