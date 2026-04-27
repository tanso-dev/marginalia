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

  const { bookId, chapterNumber } = await req.json();
  const db = getDb();

  // Step 1: Check if a shared reflection already exists for this chapter
  const existing = await db.execute({
    sql: "SELECT reflection_question FROM chapter_reflections WHERE catalog_id = ? AND chapter_number = ?",
    args: [bookId, chapterNumber],
  });

  if (existing.rows.length > 0 && existing.rows[0].reflection_question) {
    // Reflection already exists — return it without an AI call
    return NextResponse.json({ question: existing.rows[0].reflection_question });
  }

  // Step 2: No reflection exists — generate one and save it for everyone
  const bookResult = await db.execute({
    sql: "SELECT * FROM book_catalog WHERE id = ?",
    args: [bookId],
  });
  const book = bookResult.rows[0];
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const themes = safeJSON(book.themes, []);
  const chapters = safeJSON(book.chapters, []);
  const chapter = chapters.find((c) => c.number === chapterNumber);

  const response = await askClaude(
    `You are a Socratic literary tutor. Generate ONE thought-provoking reflection question for a reader who just finished the given section of this book. The question should push them to think about character motivations, thematic implications, narrative technique, or connections to their own life. Do NOT summarize the section. Just ask the question — nothing else. No preamble. The question should be 1-2 sentences max. Note: this book may not follow a traditional chapter structure — adapt your question to the specific section format.`,
    `Book: "${book.title}" by ${book.author}. Section ${chapterNumber}: "${chapter?.title || ""}". Book structure: ${book.structure_note || "Standard chapters"}. Themes: ${themes.join(", ")}.`
  );

  // Save to shared chapter_reflections table
  try {
    await db.execute({
      sql: "INSERT OR REPLACE INTO chapter_reflections (catalog_id, chapter_number, reflection_question) VALUES (?, ?, ?)",
      args: [bookId, chapterNumber, response],
    });
  } catch (e) {
    console.error("Failed to save reflection:", e);
  }

  return NextResponse.json({ question: response });
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
