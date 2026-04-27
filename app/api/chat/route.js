import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { askClaude } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, chapterNumber, message } = await req.json();
  if (!bookId || !chapterNumber || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = getDb();

  // Get book info from shared catalog
  const bookResult = await db.execute({
    sql: "SELECT * FROM book_catalog WHERE id = ?",
    args: [bookId],
  });
  const book = bookResult.rows[0];
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  // Get user's chapter progress for spoiler protection
  const progress = await db.execute({
    sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND catalog_id = ?",
    args: [payload.userId, bookId],
  });
  const chaptersRead = progress.rows.map((r) => r.chapter_number);
  const furthestRead = chaptersRead.length > 0 ? Math.max(...chaptersRead) : 0;

  // Get recent chat history for context (per-user)
  const history = await db.execute({
    sql: `SELECT role, message FROM chat_messages 
          WHERE user_id = ? AND catalog_id = ? AND chapter_number = ?
          ORDER BY created_at DESC LIMIT 6`,
    args: [payload.userId, bookId, chapterNumber],
  });

  const themes = safeJSON(book.themes, []);
  const chapters = safeJSON(book.chapters, []);
  const chapter = chapters.find((c) => c.number === chapterNumber);

  const contextMessages = history.rows.reverse().map((r) => `${r.role}: ${r.message}`).join("\n");

  const systemPrompt = `You are a literary tutor named Marginalia helping a reader reflect on "${book.title}" by ${book.author}.
The reader is discussing Chapter ${chapterNumber}: "${chapter?.title || ""}".
They have read up to chapter ${furthestRead}. NEVER reveal spoilers for chapters beyond what they have read.
Your goal is NOT to give them answers or summaries — it is to make them THINK and REFLECT.
Ask follow-up questions. Challenge their interpretations. Draw connections to themes: ${themes.join(", ")}.
Keep responses to 2-3 sentences. Be warm but intellectually rigorous. Be like a great seminar professor.

Recent conversation context:
${contextMessages}`;

  // Save user message
  await db.execute({
    sql: "INSERT INTO chat_messages (user_id, catalog_id, chapter_number, role, message) VALUES (?, ?, ?, 'user', ?)",
    args: [payload.userId, bookId, chapterNumber, message],
  });

  // Get AI response
  const response = await askClaude(systemPrompt, message);
  if (!response) {
    return NextResponse.json({ error: "AI error" }, { status: 500 });
  }

  // Save AI response
  await db.execute({
    sql: "INSERT INTO chat_messages (user_id, catalog_id, chapter_number, role, message) VALUES (?, ?, ?, 'ai', ?)",
    args: [payload.userId, bookId, chapterNumber, response],
  });

  return NextResponse.json({ response });
}

// GET: load chat history for a chapter (per-user)
export async function GET(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("bookId");
  const chapterNumber = searchParams.get("chapter");

  if (!bookId || !chapterNumber) {
    return NextResponse.json({ messages: [] });
  }

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT role, message, created_at FROM chat_messages 
          WHERE user_id = ? AND catalog_id = ? AND chapter_number = ?
          ORDER BY created_at ASC`,
    args: [payload.userId, bookId, parseInt(chapterNumber)],
  });

  return NextResponse.json({
    messages: result.rows.map((r) => ({ role: r.role, text: r.message })),
  });
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
