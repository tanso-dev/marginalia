import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { askClaude } from "@/lib/ai";

export async function POST(req) {
  const payload = await getUser();
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, theme } = await req.json();
  const db = getDb();

  const bookResult = await db.execute({
    sql: "SELECT * FROM user_books WHERE id = ? AND user_id = ?",
    args: [bookId, payload.userId],
  });
  const book = bookResult.rows[0];
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const progress = await db.execute({
    sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND book_id = ?",
    args: [payload.userId, bookId],
  });
  const chaptersRead = progress.rows.map((r) => r.chapter_number);
  const chapters = safeJSON(book.chapters, []);

  const response = await askClaude(
    `You are a literary analyst. For the given book and theme, describe how this theme evolves across the chapters the reader has completed. Be concise — 2-3 sentences total. If they haven't read many chapters, give a brief note on how to watch for this theme.`,
    `Book: "${book.title}" by ${book.author}. Theme: "${theme}". Chapters read: ${chaptersRead.length > 0 ? chaptersRead.join(", ") : "none yet"}. Total chapters: ${chapters.length}.`
  );

  return NextResponse.json({ analysis: response });
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
