"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      const meData = await meRes.json();
      setUser(meData.user);
      setDisplayName(meData.user.displayName || "");

      const booksRes = await fetch("/api/books/primer");
      const booksData = await booksRes.json();
      setBooks(booksData.books || []);
      setLoading(false);
    })();
  }, [router]);

  const handleSave = async () => {
    // For now we'll just update locally — you could add a profile update API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeBook = async (bookId) => {
    await fetch("/api/books/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    setBooks((prev) => prev.filter((b) => b.id !== bookId));
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
          <p className="text-text-dim text-sm italic">Loading profile...</p>
        </div>
      </div>
    );
  }

  const totalChaptersRead = books.reduce((sum, b) => sum + (b.chaptersRead?.length || 0), 0);
  const totalChapters = books.reduce((sum, b) => sum + (b.chapters?.length || 0), 0);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-64 min-h-screen bg-surface border-r border-border fixed left-0 top-0 bottom-0 flex flex-col z-50 hidden md:flex">
        <div className="px-6 pt-7 pb-5 border-b border-border">
          <h1 className="font-display text-xl font-bold text-accent tracking-wide">Marginalia</h1>
          <p className="text-[11px] text-text-dim mt-1 italic tracking-widest uppercase">A Literary Companion</p>
        </div>
        <nav className="p-3 flex-1">
          <button onClick={() => router.push("/library")} className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm text-text-muted hover:bg-surface-hover">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            Library
          </button>
          <button className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-lg text-sm bg-surface-active text-accent mt-0.5">
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
            <button onClick={() => router.push("/library")} className="px-3 py-1.5 text-xs text-text-muted border border-border rounded-lg">Library</button>
            <button onClick={logout} className="px-3 py-1.5 text-xs text-text-muted border border-border rounded-lg">Sign out</button>
          </div>
        </div>

        <div className="px-6 md:px-10 pt-8 pb-6 border-b border-border">
          <h2 className="font-display text-2xl md:text-[28px] font-bold">Profile</h2>
          <p className="text-text-muted text-sm mt-1">Your reading journey at a glance</p>
        </div>

        <div className="px-6 md:px-10 py-8 max-w-[1100px]">
          {/* User header */}
          <div className="flex items-center gap-6 mb-8">
            <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-accent-dim to-accent flex items-center justify-center font-display text-[28px] font-bold">
              {(user?.displayName || "R")[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-display text-[22px]">{user?.displayName || "Reader"}</h3>
              <p className="text-text-dim text-[13px]">@{user?.username}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-surface border border-border rounded-xl p-5 text-center">
              <div className="font-display text-3xl font-bold text-accent">{books.length}</div>
              <div className="text-xs text-text-dim uppercase tracking-wider mt-1">Books</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 text-center">
              <div className="font-display text-3xl font-bold text-accent">{totalChaptersRead}</div>
              <div className="text-xs text-text-dim uppercase tracking-wider mt-1">Chapters Read</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5 text-center">
              <div className="font-display text-3xl font-bold text-accent">
                {totalChapters > 0 ? Math.round((totalChaptersRead / totalChapters) * 100) : 0}%
              </div>
              <div className="text-xs text-text-dim uppercase tracking-wider mt-1">Completion</div>
            </div>
          </div>

          {/* Settings */}
          <div className="mb-8">
            <h3 className="font-display text-lg mb-4">Settings</h3>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-[13px] text-text-muted w-28 flex-shrink-0">Display Name</label>
              <input
                className="flex-1 px-3.5 py-2.5 bg-surface border border-border rounded-lg text-text font-body text-sm outline-none focus:border-accent-dim transition-colors"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2.5 mt-3">
              <button onClick={handleSave} className="px-5 py-2.5 bg-accent-dim hover:bg-accent text-text rounded-lg text-[13px] font-medium transition-colors">Save</button>
              {saved && <span className="text-success text-[13px]">Saved!</span>}
            </div>
          </div>

          {/* Books list */}
          {books.length > 0 && (
            <div>
              <h3 className="font-display text-lg mb-4">Your Books</h3>
              {books.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-3 border-b border-border">
                  <div>
                    <div className="font-display text-[15px]">{b.title}</div>
                    <div className="text-xs text-text-dim">{b.author} · {b.chaptersRead?.length || 0}/{b.chapters?.length || 0} chapters</div>
                  </div>
                  <button
                    onClick={() => removeBook(b.id)}
                    className="px-3 py-1.5 border border-border text-text-muted rounded-md text-[11px] hover:border-danger hover:text-danger transition-all"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
