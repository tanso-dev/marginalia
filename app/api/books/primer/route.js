import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { askClaudeJSON } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const payload = await getUserFromRequest(req);
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, author, year, genre, coverId, olKey } = await req.json();
    if (!title || !author) {
      return NextResponse.json({ error: "Title and author required" }, { status: 400 });
    }

    const db = getDb();
    const titleLower = title.toLowerCase().trim();
    const authorLower = author.toLowerCase().trim();

    // Step 1: Check if this book already exists in the shared catalog
    let catalog = await db.execute({
      sql: "SELECT * FROM book_catalog WHERE title_lower = ? AND author_lower = ?",
      args: [titleLower, authorLower],
    });

    let catalogId;

    if (catalog.rows.length > 0 && catalog.rows[0].chapters) {
      // Book exists with primer data — use it (no AI call needed)
      catalogId = catalog.rows[0].id;
    } else {
      // Step 2: Generate primer via AI (first user to open this book pays the cost)
      const primer = await askClaudeJSON(
        `You are a literary scholar with deep knowledge of book structures. Generate a comprehensive primer for the given book. Return JSON with:
{
  "authorBio": "A 2-3 sentence bio of the author focusing on their literary significance",
  "historicalContext": "2-3 sentences about the historical period and context in which the book was written",
  "themes": ["theme1", "theme2"],
  "themeDescriptions": {"theme1": "brief description"},
  "structureNote": "1 sentence explaining how this book is structured",
  "chapters": [{"number": 1, "title": "...", "part": "Part name if applicable", "summary": "1 sentence teaser without spoilers"}],
  "readingTips": "1-2 sentences of advice for approaching this book"
}

CRITICAL RULES for the "chapters" array:

1. ACCURACY IS PARAMOUNT. You must faithfully represent the book's actual structure. Do not invent, merge, or rename parts of the book. Use the real titles and divisions as published.

2. For OMNIBUS or COLLECTED editions (two or more works in one volume):
   - Treat each work as its own distinct section. Do NOT blend them together.
   - Use the "part" field to label which work each entry belongs to.
   - Example for "Wind/Pinball" by Murakami: the first work is "Hear the Wind Sing" and the second is "Pinball, 1973". These are two separate novellas. Sections from "Hear the Wind Sing" must have "part": "Hear the Wind Sing", sections from the second must have "part": "Pinball, 1973".

3. For books with PARTS, ACTS, or named divisions: use the "part" field to label the parent division. Example: {"number": 1, "title": "Chapter 1: The Boy Who Lived", "part": "Part One: The Philosopher's Stone"}.

4. For standard chapter books: set "part" to null.

5. If the book uses numbered fragments or short sections, group them into logical reading segments within their respective parts. Never group sections across different parts/works.

6. Maximum 30 entries total. Keep summaries spoiler-light.`,
        `Book: "${title}" by ${author}`,
        3000
      );

      if (!primer) {
        return NextResponse.json({ error: "Failed to generate primer. The AI service may be temporarily unavailable." }, { status: 502 });
      }

      if (catalog.rows.length > 0) {
        catalogId = catalog.rows[0].id;
        await db.execute({
          sql: `UPDATE book_catalog SET author_bio = ?, historical_context = ?, reading_tips = ?,
                structure_note = ?, themes = ?, theme_descriptions = ?, chapters = ?, year = ?, genre = ?,
                cover_id = ?, ol_key = ? WHERE id = ?`,
          args: [
            primer.authorBio || "", primer.historicalContext || "", primer.readingTips || "",
            primer.structureNote || "", JSON.stringify(primer.themes || []), JSON.stringify(primer.themeDescriptions || {}),
            JSON.stringify(primer.chapters || []), year || null, genre || null,
            coverId || null, olKey || null, catalogId,
          ],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO book_catalog (title, author, title_lower, author_lower, year, genre, cover_id, ol_key,
                author_bio, historical_context, reading_tips, structure_note, themes, theme_descriptions, chapters)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            title, author, titleLower, authorLower, year || null, genre || null,
            coverId || null, olKey || null,
            primer.authorBio || "", primer.historicalContext || "", primer.readingTips || "",
            primer.structureNote || "", JSON.stringify(primer.themes || []), JSON.stringify(primer.themeDescriptions || {}),
            JSON.stringify(primer.chapters || []),
          ],
        });

        const newCatalog = await db.execute({
          sql: "SELECT id FROM book_catalog WHERE title_lower = ? AND author_lower = ?",
          args: [titleLower, authorLower],
        });
        catalogId = newCatalog.rows[0].id;
      }

      // Refresh catalog row
      catalog = await db.execute({
        sql: "SELECT * FROM book_catalog WHERE id = ?",
        args: [catalogId],
      });
    }

    // Step 3: Add book to user's library if not already there
    await db.execute({
      sql: "INSERT OR IGNORE INTO user_books (user_id, catalog_id) VALUES (?, ?)",
      args: [payload.userId, catalogId],
    });

    // Step 4: Get user's chapter progress
    const progress = await db.execute({
      sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND catalog_id = ?",
      args: [payload.userId, catalogId],
    });

    // Step 5: Get shared reflection questions
    const reflections = await db.execute({
      sql: "SELECT chapter_number, questions FROM chapter_reflections WHERE catalog_id = ?",
      args: [catalogId],
    });

    return NextResponse.json({
      book: formatBook(catalog.rows[0], progress.rows, reflections.rows),
    });
  } catch (e) {
    console.error("Primer route error:", e);
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 });
  }
}

// GET: list all user books
export async function GET(req) {
  const payload = await getUserFromRequest(req);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const books = await db.execute({
    sql: `SELECT bc.* FROM user_books ub 
          JOIN book_catalog bc ON ub.catalog_id = bc.id 
          WHERE ub.user_id = ? ORDER BY ub.created_at DESC`,
    args: [payload.userId],
  });

  const result = [];
  for (const book of books.rows) {
    const progress = await db.execute({
      sql: "SELECT chapter_number FROM chapter_progress WHERE user_id = ? AND catalog_id = ?",
      args: [payload.userId, book.id],
    });
    const reflections = await db.execute({
      sql: "SELECT chapter_number, questions FROM chapter_reflections WHERE catalog_id = ?",
      args: [book.id],
    });
    result.push(formatBook(book, progress.rows, reflections.rows));
  }

  return NextResponse.json({ books: result });
}

function formatBook(catalogRow, progressRows = [], reflectionRows = []) {
  const chaptersRead = progressRows.map((r) => r.chapter_number);
  const reflections = {};
  for (const r of reflectionRows) {
    if (r.questions) {
      const parsed = safeJSON(r.questions, []);
      if (parsed.length > 0) {
        reflections[r.chapter_number] = parsed;
      }
    }
  }
  return {
    id: catalogRow.id,
    title: catalogRow.title,
    author: catalogRow.author,
    year: catalogRow.year,
    genre: catalogRow.genre,
    coverId: catalogRow.cover_id,
    olKey: catalogRow.ol_key,
    authorBio: catalogRow.author_bio,
    historicalContext: catalogRow.historical_context,
    readingTips: catalogRow.reading_tips,
    structureNote: catalogRow.structure_note || null,
    themes: safeJSON(catalogRow.themes, []),
    themeDescriptions: safeJSON(catalogRow.theme_descriptions, {}),
    chapters: safeJSON(catalogRow.chapters, []),
    chaptersRead,
    reflections,
  };
}

function safeJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
