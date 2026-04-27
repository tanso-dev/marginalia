import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { askClaude } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, chapterNumber } = await req.json();
  const db = getDb();

  const bookResult = await db.execute({
    sql: "SELECT * FROM user_books WHERE id = ? AND user_id = ?",
    args: [bookId, payload.userId],
  });
  const book = bookResult.rows[0];
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const themes = safeJSON(book.themes, []);
  const chapters = safeJSON(book.chapters, []);
  const chapter = chapters.find((c) => c.number === chapterNumber);

  const response = await askClaude(
    `You are a Socratic literary tutor. Generate ONE thought-provoking reflection question for a reader who just finished the given chapter. The question should push them to think about character motivations, thematic implications, or connections to their own life. Do NOT summarize the chapter. Just ask the question — nothing else. No preamble. The question should be 1-2 sentences max.`,
    `Book: "${book.title}" by ${book.author}. Chapter ${chapterNumber}: "${chapter?.title || ""}". Themes: ${themes.join(", ")}.`
  );

  return NextResponse.json({ question: response });
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
