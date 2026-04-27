import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { askClaudeJSON } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, chapterNumber } = await req.json();
  const db = getDb();

  // Check if shared questions already exist for this chapter
  const existing = await db.execute({
    sql: "SELECT questions FROM chapter_reflections WHERE catalog_id = ? AND chapter_number = ?",
    args: [bookId, chapterNumber],
  });

  if (existing.rows.length > 0 && existing.rows[0].questions) {
    const questions = safeJSON(existing.rows[0].questions, []);
    if (questions.length > 0) {
      return NextResponse.json({ questions });
    }
  }

  // No questions exist — generate 3 and save for everyone
  const bookResult = await db.execute({
    sql: "SELECT * FROM book_catalog WHERE id = ?",
    args: [bookId],
  });
  const book = bookResult.rows[0];
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const themes = safeJSON(book.themes, []);
  const chapters = safeJSON(book.chapters, []);
  const chapter = chapters.find((c) => c.number === chapterNumber);

  const result = await askClaudeJSON(
    `You are a Socratic literary tutor. Generate exactly 3 distinct, thought-provoking reflection questions for a reader who just finished the given section. 

Each question should take a DIFFERENT angle:
1. One about character motivations, decisions, or relationships
2. One about thematic implications or symbolic meaning  
3. One that connects the reading to the reader's own life or worldview

Rules:
- Do NOT summarize the section
- Each question should be 1-2 sentences
- If this book contains multiple works (omnibus), only reference the specific work/part this section belongs to
- Return a JSON array of exactly 3 strings: ["question 1", "question 2", "question 3"]`,
    `Book: "${book.title}" by ${book.author}. Section ${chapterNumber}: "${chapter?.title || ""}"${chapter?.part ? ` (Part of: "${chapter.part}")` : ""}. Book structure: ${book.structure_note || "Standard chapters"}. Themes: ${themes.join(", ")}.`
  );

  const questions = Array.isArray(result) ? result.slice(0, 3) : [];

  if (questions.length === 0) {
    return NextResponse.json({ error: "Failed to generate questions" }, { status: 502 });
  }

  // Save to shared chapter_reflections table
  try {
    await db.execute({
      sql: "INSERT OR REPLACE INTO chapter_reflections (catalog_id, chapter_number, questions) VALUES (?, ?, ?)",
      args: [bookId, chapterNumber, JSON.stringify(questions)],
    });
  } catch (e) {
    console.error("Failed to save reflections:", e);
  }

  return NextResponse.json({ questions });
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
