# Marginalia — A Literary Companion 📚

AI-powered literary tutor for guided reading and reflection. Search for books, get rich primers with author bios, historical context, and themes, then engage in AI-guided chapter discussions and Socratic reflection.

## Features
- 📖 **Book Search** — Powered by Open Library API (no AI tokens used)
- 🎓 **AI Book Primers** — Author bio, historical context, key themes, chapter breakdowns
- 💬 **Chapter Discussions** — AI tutor that pushes reflection, not summaries
- 💡 **Socratic Mode** — Auto-generated reflection questions when you finish a chapter
- 🔍 **Theme Tracker** — Track how themes evolve across your reading
- 📊 **Progress Tracking** — Mark chapters as read, spoiler-protected discussions
- 👥 **Multi-user** — Each reader gets their own account and library

---

## 🚀 Deploy in 4 Steps (Turso + Vercel + GitHub)

### Step 1: Set Up the Database (Turso — free)

1. Go to [turso.tech/app](https://turso.tech/app) and sign up with GitHub
2. Click **"Create Database"**, name it `marginalia`, pick a region close to you
3. Get your **Database URL** (looks like `libsql://marginalia-yourname.turso.io`)
4. Generate an **Auth Token** (under Settings/Tokens for the database)
5. Save both values — you'll need them in Step 3

> **Windows users**: You can do everything through the Turso web dashboard — no CLI needed!

### Step 2: Get an Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add credits ($5 minimum — this will last a long time)
3. Go to **API Keys** and create a new key
4. Save the key (starts with `sk-ant-...`)

### Step 3: Get the Code on GitHub

**Option A — Drag & Drop (easiest, no terminal needed):**
1. Unzip the download
2. Create a new repo at [github.com/new](https://github.com/new) — name it `marginalia`
3. On the repo page, click **"uploading an existing file"**
4. Drag ALL the unzipped files/folders into the upload area
5. Click **"Commit changes"**

**Option B — Terminal:**
```bash
cd marginalia
git init && git add . && git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/marginalia.git
git push -u origin main
```

### Step 4: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com), sign in with GitHub
2. Click **"Add New Project"** → import your `marginalia` repo
3. Before deploying, add these **4 Environment Variables**:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | Your Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Your Turso auth token |
| `JWT_SECRET` | Any random string (e.g. `book-club-marginalia-2025-xyz`) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`) |

4. Click **"Deploy"** and wait ~1-2 minutes

### Step 5: Set Up Database Tables (one time)

After deployment, you need to create the database tables. The easiest way:

1. Open your Turso dashboard → click into your `marginalia` database
2. Go to the **Shell** or **SQL Editor** tab
3. Run each of these SQL statements one at a time:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Reader',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  cover_id TEXT,
  ol_key TEXT,
  author_bio TEXT,
  historical_context TEXT,
  reading_tips TEXT,
  themes TEXT,
  theme_descriptions TEXT,
  chapters TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, title, author)
);

CREATE TABLE IF NOT EXISTS chapter_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_id) REFERENCES user_books(id),
  UNIQUE(user_id, book_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER NOT NULL,
  chapter_number INTEGER NOT NULL,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_id) REFERENCES user_books(id)
);
```

4. That's it! Visit your Vercel URL and create your first account.

---

## 💰 Cost

- **Turso**: Free tier (500 databases, 9GB storage)
- **Vercel**: Free tier (hobby projects)
- **Anthropic API**: ~$5 minimum credit. Each book primer costs ~$0.01-0.02. Each chat message costs ~$0.003. A heavy reader might spend $0.50/month.
- **Open Library API**: Completely free, no key needed

---

## 🛠 Local Development

```bash
npm install
cp .env.example .env.local
# Fill in your credentials in .env.local
npm run db:setup
npm run dev
```

Open [localhost:3000](http://localhost:3000)

---

## Tech Stack
- **Frontend**: Next.js 14 + React + Tailwind CSS
- **Database**: Turso (SQLite on the edge)
- **Auth**: JWT tokens with bcrypt password hashing
- **AI**: Anthropic Claude API (server-side only)
- **Book Data**: Open Library API
- **Hosting**: Vercel
