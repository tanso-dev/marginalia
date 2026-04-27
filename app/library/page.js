"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LibraryPage() {
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { router.push("/"); return; }
      const data = await res.json();
      setUser(data.user);

      const booksRes = await fetch("/api/books/primer");
      const booksData = await booksRes.json();
      setBooks(booksData.books || []);
      setLoading(false);
    })();
  }, [router]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 500);
    } else {
      setResults(null);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && query.trim()) {
      clearTimeout(debounceRef.current);
      doSearch(query);
    }
  };

  const openBook = (bookData) => {
    const params = new URLSearchParams({
      title: bookData.title,
      author: bookData.author,
      ...(bookData.year && { year: bookData.year }),
      ...(bookData.genre && { genre: bookData.genre }),
      ...(bookData.coverId && { coverId: bookData.coverId }),
      ...(bookData.olKey && { olKey: bookData.olKey }),
      ...(bookData.id && { id: bookData.id }),
    });
    router.push(`/book?${params.toString()}`);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-text-dim text-sm italic">Opening the library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 min-h-screen bg-surface border-r border-border fixed left-0 top-0 bottom-0 flex flex-col z-50 hidden md:flex">
        <div className="px-6 pt-7 pb-5 border-b border-border">
          <h1 className="font-display text-xl font-bold text-accent tracking-wide">Marginalia</h1>
          <p className="text-[11px] text-text-dim mt-1 italic tracking-widest uppercase">A Literary Companion</p>
        </div>
        <nav className="p-3 flex-1">
          <button className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm bg-surface-active text-accent">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            Library
          </button>
          <button onClick={() => router.push("/profile")} className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm text-text-muted hover:bg-surface-hover mt-0.5">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </button>
        </nav>
        <div className="p-4 border-t border-border">
          <button onClick={logout} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg hover:bg-surface-hover text-left">
            <div className="w-8 h-8 rounded-full bg-accent-dim flex items-center justify-center font-display font-bold text-sm">
              {(user?.displayName || "R")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.displayName || "Reader"}</div>
              <div className="text-[11px] text-text-dim">Sign out</div>
            </div>
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="md:ml-64 flex-1 min-h-screen">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-surface">
          <h1 className="font-display text-lg font-bold text-accent">Marginalia</h1>
          <div className="flex gap-2">
            <button onClick={() => router.push("/profile")} className="px-3 py-1.5 text-xs text-text-muted border border-border rounded-lg">Profile</button>
            <button onClick={logout} className="px-3 py-1.5 text-xs text-text-muted border border-border rounded-lg">Sign out</button>
          </div>
        </div>

        <div className="px-6 md:px-10 pt-8 pb-6 border-b border-border">
          <h2 className="font-display text-2xl md:text-[28px] font-bold">Library</h2>
          <p className="text-text-muted text-sm mt-1">Search for a book to begin your guided reading journey</p>
        </div>

        <div className="px-6 md:px-10 py-8 max-w-[1100px]">
          {/* Search */}
          <div className="relative mb-8">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="w-full py-3.5 pl-12 pr-5 bg-surface border border-border rounded-xl text-text font-body text-[15px] outline-none focus:border-accent-dim placeholder:text-text-dim transition-colors"
              placeholder="Search by title, author, or theme..."
              value={query}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
            />
          </div>

          {searching && (
            <div className="flex flex-col items-center py-16">
              <div className="spinner mb-4" />
              <p className="text-text-dim text-sm italic">Searching the stacks...</p>
            </div>
          )}

          {results && !searching && results.length > 0 && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden mb-8">
              {results.map((b, i) => (
                <button
                  key={i}
                  onClick={() => openBook(b)}
                  className="flex gap-4 items-start w-full text-left px-5 py-4 border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                >
                  {b.coverId ? (
                    <img src={`https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} alt="" className="w-11 h-16 rounded object-cover flex-shrink-0 border border-border" />
                  ) : (
                    <div className="w-11 h-16 rounded flex-shrink-0 bg-surface-active border border-border flex items-center justify-center font-display text-lg text-text-dim">📖</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-[15px]">{b.title}</div>
                    <div className="text-accent text-[13px] mt-0.5">{b.author}</div>
                    <div className="text-text-muted text-xs mt-1">{b.description}</div>
                  </div>
                  <div className="text-text-dim text-[11px] whitespace-nowrap flex-shrink-0 mt-0.5">
                    {b.year || "—"} · {b.genre}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results && !searching && results.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-30">📚</div>
              <h3 className="font-display text-xl text-text-muted mb-2">No matches found</h3>
              <p className="text-text-dim text-sm">Try a different title or author name</p>
            </div>
          )}

          {/* User's books */}
          {books.length > 0 && (
            <div className={results ? "mt-4" : ""}>
              <h3 className="font-display text-lg text-text-muted mb-4">Your Books</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {books.map((b) => {
                  const read = b.chaptersRead?.length || 0;
                  const total = b.chapters?.length || 1;
                  const pct = Math.round((read / total) * 100);
                  return (
                    <button
                      key={b.id}
                      onClick={() => openBook(b)}
                      className="bg-surface border border-border rounded-xl overflow-hidden text-left hover:border-border-light hover:-translate-y-0.5 transition-all group"
                    >
                      {b.coverId ? (
                        <img src={`https://covers.openlibrary.org/b/id/${b.coverId}-M.jpg`} alt="" className="w-full h-44 object-cover border-b border-border" />
                      ) : (
                        <div className="w-full h-44 bg-gradient-to-br from-surface-active to-surface border-b border-border flex items-center justify-center font-display text-4xl text-text-dim">📖</div>
                      )}
                      <div className="p-5">
                        <div className="text-[10px] uppercase tracking-widest text-accent mb-2">{b.genre}</div>
                        <div className="font-display text-[17px] font-bold leading-tight mb-1">{b.title}</div>
                        <div className="text-[13px] text-text-muted mb-3">{b.author}</div>
                        <div>
                          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                          <div className="flex justify-between text-[11px] text-text-dim mt-1.5">
                            <span>{read} of {total} chapters</span>
                            <span>{pct}%</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!results && books.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-30">📖</div>
              <h3 className="font-display text-xl text-text-muted mb-2">Your Library Awaits</h3>
              <p className="text-text-dim text-sm max-w-md mx-auto">Search for a book above to begin. We'll create a personalized reading companion with context, themes, and guided reflection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
