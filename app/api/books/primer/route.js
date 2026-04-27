import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { askClaudeJSON } from "@/lib/ai";

export const runtime = "nodejs";

export async function POST(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, author, year, genre, coverId, olKey } = await req.json();
  if (!title || !author) {
    return NextResponse.json({ error: "Title and author required" }, { status: 400 });
  }

  const db = getDb();

  // Check if user already has this book with primer data
  const existing = await db.execute({
    sql: "SELECT * FROM user_books WHERE user_id = ? AND LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?)",
    args: [payload.userId, title, author],
  });

  if (existing.rows.length > 0 && existing.rows[0].chapters) {
    const book = existing.rows[0];
    // Also get chapter progress
    const progress = await db.execute({
      sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND book_id = ?",
      args: [payload.userId, book.id],
    });

    return NextResponse.json({
      book: formatBook(book, progress.rows.map((r) => r.chapter_number)),
    });
  }

  // Generate primer via AI
  const primer = await askClaudeJSON(
    `You are a literary scholar. Generate a comprehensive primer for the given book. Return JSON with:
{
  "authorBio": "A 2-3 sentence bio of the author focusing on their literary significance",
  "historicalContext": "2-3 sentences about the historical period and context in which the book was written",
  "themes": ["theme1", "theme2"],
  "themeDescriptions": {"theme1": "brief description"},
  "chapters": [{"number": 1, "title": "Chapter Title or description", "summary": "1 sentence teaser without spoilers"}],
  "readingTips": "1-2 sentences of advice for approaching this book"
}
For the chapters array, include actual chapter titles/numbers. If the book has many chapters, include up to 30. Keep chapter summaries spoiler-light.`,
    `Book: "${title}" by ${author}`,
    2048
  );

  if (!primer) {
    return NextResponse.json({ error: "Failed to generate primer" }, { status: 500 });
  }

  // Save or update in database
  const bookId = existing.rows.length > 0 ? existing.rows[0].id : null;

  if (bookId) {
    await db.execute({
      sql: `UPDATE user_books SET author_bio = ?, historical_context = ?, reading_tips = ?,
            themes = ?, theme_descriptions = ?, chapters = ?, year = ?, genre = ?,
            cover_id = ?, ol_key = ? WHERE id = ?`,
      args: [
        primer.authorBio || "", primer.historicalContext || "", primer.readingTips || "",
        JSON.stringify(primer.themes || []), JSON.stringify(primer.themeDescriptions || {}),
        JSON.stringify(primer.chapters || []), year || null, genre || null,
        coverId || null, olKey || null, bookId,
      ],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO user_books (user_id, title, author, year, genre, cover_id, ol_key,
            author_bio, historical_context, reading_tips, themes, theme_descriptions, chapters)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        payload.userId, title, author, year || null, genre || null,
        coverId || null, olKey || null,
        primer.authorBio || "", primer.historicalContext || "", primer.readingTips || "",
        JSON.stringify(primer.themes || []), JSON.stringify(primer.themeDescriptions || {}),
        JSON.stringify(primer.chapters || []),
      ],
    });
  }

  // Fetch the saved book
  const saved = await db.execute({
    sql: "SELECT * FROM user_books WHERE user_id = ? AND LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?)",
    args: [payload.userId, title, author],
  });

  const progress = await db.execute({
    sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND book_id = ?",
    args: [payload.userId, saved.rows[0].id],
  });

  return NextResponse.json({
    book: formatBook(saved.rows[0], progress.rows.map((r) => r.chapter_number)),
  });
}

// GET: list all user books
export async function GET(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const books = await db.execute({
    sql: "SELECT * FROM user_books WHERE user_id = ? ORDER BY created_at DESC",
    args: [payload.userId],
  });

  const result = [];
  for (const book of books.rows) {
    const progress = await db.execute({
      sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND book_id = ?",
      args: [payload.userId, book.id],
    });
    result.push(formatBook(book, progress.rows.map((r) => r.chapter_number)));
  }

  return NextResponse.json({ books: result });
}

function formatBook(row, chaptersRead = []) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    year: row.year,
    genre: row.genre,
    coverId: row.cover_id,
    olKey: row.ol_key,
    authorBio: row.author_bio,
    historicalContext: row.historical_context,
    readingTips: row.reading_tips,
    themes: safeJSON(row.themes, []),
    themeDescriptions: safeJSON(row.theme_descriptions, {}),
    chapters: safeJSON(row.chapters, []),
    chaptersRead,
  };
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
