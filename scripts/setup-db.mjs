import { createClient } from "@libsql/client";
import { config } from "dotenv";

config({ path: ".env.local" });

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function setup() {
  console.log("Setting up Marginalia database...\n");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT 'Reader',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✓ users table");


  await db.execute(`
    CREATE TABLE IF NOT EXISTS book_catalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      title_lower TEXT NOT NULL,
      author_lower TEXT NOT NULL,
      year INTEGER,
      genre TEXT,
      cover_id TEXT,
      ol_key TEXT,
      author_bio TEXT,
      historical_context TEXT,
      reading_tips TEXT,
      structure_note TEXT,
      themes TEXT,
      theme_descriptions TEXT,
      chapters TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(title_lower, author_lower)
    )
  `);
  console.log("✓ book_catalog table (shared)");


  await db.execute(`
    CREATE TABLE IF NOT EXISTS chapter_reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      catalog_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL,
      questions TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (catalog_id) REFERENCES book_catalog(id),
      UNIQUE(catalog_id, chapter_number)
    )
  `);
  console.log("✓ chapter_reflections table (shared)");


  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      catalog_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (catalog_id) REFERENCES book_catalog(id),
      UNIQUE(user_id, catalog_id)
    )
  `);
  console.log("✓ user_books table (per-user)");


  await db.execute(`
    CREATE TABLE IF NOT EXISTS chapter_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      catalog_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (catalog_id) REFERENCES book_catalog(id),
      UNIQUE(user_id, catalog_id, chapter_number)
    )
  `);
  console.log("✓ chapter_progress table (per-user)");

  await db.execute(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      catalog_id INTEGER NOT NULL,
      chapter_number INTEGER NOT NULL,
      role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (catalog_id) REFERENCES book_catalog(id)
    )
  `);
  console.log("✓ chat_messages table (per-user)");

  console.log("\n🎉 Database setup complete!");
  process.exit(0);
}

setup().catch((e) => {
  console.error("Setup failed:", e);
  process.exit(1);
});
