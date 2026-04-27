"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BookContent() {
  const [user, setUser] = useState(null);
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("chapters");
  const [discussion, setDiscussion] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [socraticQ, setSocraticQ] = useState(null);
  const [socraticLoading, setSocraticLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState(null);
  const [themeEvolution, setThemeEvolution] = useState({});
  const [themeLoading, setThemeLoading] = useState(null);
  const messagesEndRef = useRef(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const title = searchParams.get("title");
  const author = searchParams.get("author");

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/"); return; }
      const meData = await meRes.json();
      setUser(meData.user);

      if (!title || !author) { router.push("/library"); return; }

      const res = await fetch("/api/books/primer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          year: searchParams.get("year") ? parseInt(searchParams.get("year")) : null,
          genre: searchParams.get("genre"),
          coverId: searchParams.get("coverId"),
          olKey: searchParams.get("olKey"),
        }),
      });
      const data = await res.json();
      if (data.book) setBook(data.book);
      setLoading(false);
    })();
  }, [title, author, router, searchParams]);

  const toggleChapter = async (num) => {
    const isRead = book.chaptersRead?.includes(num);
    const res = await fetch("/api/books/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, chapterNumber: num, completed: !isRead }),
    });
    const data = await res.json();
    setBook((b) => ({ ...b, chaptersRead: data.chaptersRead }));

    // Only trigger reflection when marking a chapter as COMPLETE (not when unchecking)
    if (!isRead) generateSocratic(num);
  };

  const generateSocratic = async (chapterNum) => {
    setSocraticLoading(true);
    const res = await fetch("/api/socratic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, chapterNumber: chapterNum }),
    });
    const data = await res.json();
    setSocraticQ({ chapterNum, question: data.question });
    setSocraticLoading(false);
  };

  const openDiscussion = async (ch) => {
    setDiscussion({ chapterNum: ch.number, chapterTitle: ch.title, messages: [] });
    // Load existing chat history
    const res = await fetch(`/api/chat?bookId=${book.id}&chapter=${ch.number}`);
    const data = await res.json();
    setDiscussion((d) => ({ ...d, messages: data.messages || [] }));
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || sending) return;
    const msg = chatInput.trim();
    setChatInput("");
    setDiscussion((d) => ({ ...d, messages: [...d.messages, { role: "user", text: msg }] }));
    setSending(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, chapterNumber: discussion.chapterNum, message: msg }),
    });
    const data = await res.json();
    setDiscussion((d) => ({ ...d, messages: [...d.messages, { role: "ai", text: data.response }] }));
    setSending(false);
  };

  const loadThemeEvolution = async (theme) => {
    if (themeEvolution[theme] && activeTheme === theme) {
      setActiveTheme(null);
      return;
    }
    setActiveTheme(theme);
    if (themeEvolution[theme]) return;

    setThemeLoading(theme);
    const res = await fetch("/api/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId: book.id, theme }),
    });
    const data = await res.json();
    setThemeEvolution((prev) => ({ ...prev, [theme]: data.analysis }));
    setThemeLoading(null);
  };

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [discussion?.messages?.length]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-text-dim text-sm italic">Preparing your literary companion...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-30">📖</div>
          <h3 className="font-display text-xl text-text-muted mb-2">Something went wrong</h3>
          <p className="text-text-dim text-sm mb-4">We couldn't load that book.</p>
          <button onClick={() => router.push("/library")} className="px-5 py-2.5 bg-accent-dim hover:bg-accent text-text rounded-lg text-sm font-medium transition-colors">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  const chaptersRead = book.chaptersRead || [];
  const readCount = chaptersRead.length;
  const totalChapters = book.chapters?.length || 1;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="px-6 md:px-10 py-8 md:py-10 border-b border-border flex flex-col md:flex-row gap-6 md:gap-10 items-start">
        {book.coverId ? (
          <img
            src={`https://covers.openlibrary.org/b/id/${book.coverId}-L.jpg`}
            alt={book.title}
            className="w-36 md:w-44 rounded-lg object-cover flex-shrink-0 border border-border-light shadow-xl shadow-black/40"
          />
        ) : (
          <div className="w-36 md:w-44 min-h-[220px] md:min-h-[260px] rounded-lg bg-gradient-to-br from-surface-active to-surface border border-border-light flex flex-col items-center justify-center p-6 flex-shrink-0 relative overflow-hidden">
            <div className="absolute top-3 left-0 right-0 bottom-3 border-l-[3px] border-accent-dim ml-4" />
            <div className="font-display text-base font-bold text-center leading-tight relative z-10">{book.title}</div>
            <div className="text-[11px] text-text-muted mt-2 text-center relative z-10">{book.author}</div>
          </div>
        )}

        <div className="flex-1">
          <button onClick={() => router.push("/library")} className="flex items-center gap-1.5 text-text-dim text-[13px] hover:text-text-muted mb-3 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to Library
          </button>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold leading-tight mb-1">{book.title}</h2>
          <div className="text-accent text-base italic mb-5">by {book.author} · {book.year}</div>

          {book.authorBio && (
            <div className="mb-5">
              <h4 className="font-display text-xs uppercase tracking-widest text-accent mb-1.5">About the Author</h4>
              <p className="text-sm text-text-muted leading-relaxed">{book.authorBio}</p>
            </div>
          )}
          {book.historicalContext && (
            <div className="mb-5">
              <h4 className="font-display text-xs uppercase tracking-widest text-accent mb-1.5">Historical Context</h4>
              <p className="text-sm text-text-muted leading-relaxed">{book.historicalContext}</p>
            </div>
          )}
          {book.readingTips && (
            <div className="mb-5">
              <h4 className="font-display text-xs uppercase tracking-widest text-accent mb-1.5">Reading Tips</h4>
              <p className="text-sm text-text-muted leading-relaxed">{book.readingTips}</p>
            </div>
          )}
          {book.themes?.length > 0 && (
            <div>
              <h4 className="font-display text-xs uppercase tracking-widest text-accent mb-2">Key Themes</h4>
              <div className="flex flex-wrap gap-2">
                {book.themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => loadThemeEvolution(t)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all ${
                      activeTheme === t
                        ? "border-accent-dim text-accent bg-accent/10"
                        : "border-border text-text-muted hover:border-accent-dim hover:text-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {activeTheme && (
                <div className="mt-2 px-4 py-3 bg-surface border-l-2 border-accent-dim rounded-r-lg text-[13px] text-text-muted leading-relaxed">
                  {themeLoading === activeTheme ? (
                    <span className="text-text-dim italic">Analyzing theme across your reading...</span>
                  ) : (
                    themeEvolution[activeTheme] || book.themeDescriptions?.[activeTheme] || ""
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border px-6 md:px-10">
        {["chapters", "themes"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3.5 text-[13px] uppercase tracking-wider font-body border-b-2 transition-colors ${
              tab === t ? "text-accent border-accent" : "text-text-dim border-transparent hover:text-text-muted"
            }`}
          >
            {t === "chapters" ? "Chapters" : "Theme Tracker"}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-6 md:px-10 py-8">
        {tab === "chapters" && (
          <>
            {/* Progress */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 progress-bar"><div className="progress-fill" style={{ width: `${Math.round((readCount / totalChapters) * 100)}%` }} /></div>
              <span className="text-[13px] text-text-dim whitespace-nowrap">{readCount}/{totalChapters} chapters</span>
            </div>

            {/* Chapter list */}
            <div className="flex flex-col gap-1">
              {(book.chapters || []).map((ch) => {
                const isRead = chaptersRead.includes(ch.number);
                return (
                  <div key={ch.number} className="flex items-center gap-3.5 px-4 py-3.5 rounded-lg hover:bg-surface transition-colors">
                    <button
                      onClick={() => toggleChapter(ch.number)}
                      className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isRead ? "bg-accent border-accent" : "border-border-light hover:border-accent-dim"
                      }`}
                    >
                      {isRead && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                    <span className="font-mono text-xs text-text-dim w-7 flex-shrink-0">{String(ch.number).padStart(2, "0")}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{ch.title}</div>
                      {ch.summary && <div className="text-xs text-text-dim mt-0.5 truncate">{ch.summary}</div>}
                    </div>
                    <button
                      onClick={() => openDiscussion(ch)}
                      className="px-3.5 py-1.5 bg-surface-active border border-border rounded-md text-text-muted text-xs hover:border-accent-dim hover:text-accent transition-all flex-shrink-0"
                    >
                      Discuss
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Socratic Reflection Modal */}
            {(socraticLoading || socraticQ) && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,15,14,0.8)", backdropFilter: "blur(4px)" }}>
                <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/50 overflow-hidden">
                  {/* Modal header */}
                  <div className="px-6 pt-6 pb-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-accent" strokeWidth="1.5">
                          <path d="M9 18h6"/><path d="M10 22h4"/>
                          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0018 8 6 6 0 006 8c0 1 .23 2.23 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold">Time to Reflect</h3>
                        {socraticQ && <p className="text-xs text-text-dim mt-0.5">Chapter {socraticQ.chapterNum}</p>}
                      </div>
                    </div>
                    {!socraticLoading && (
                      <button onClick={() => setSocraticQ(null)} className="text-text-dim hover:text-text text-xl leading-none px-1 transition-colors">×</button>
                    )}
                  </div>

                  {/* Modal body */}
                  <div className="px-6 py-6">
                    {socraticLoading ? (
                      <div className="flex flex-col items-center py-8">
                        <div className="spinner mb-4" />
                        <p className="text-text-dim text-sm italic">Crafting a reflection question...</p>
                      </div>
                    ) : socraticQ ? (
                      <>
                        <p className="text-[15px] text-text leading-relaxed italic font-body">
                          "{socraticQ.question}"
                        </p>
                        <div className="flex flex-col gap-2.5 mt-6">
                          <button
                            onClick={() => {
                              const ch = book.chapters?.find((c) => c.number === socraticQ.chapterNum);
                              if (ch) {
                                openDiscussion(ch);
                                setTimeout(() => {
                                  setDiscussion((d) => d ? ({ ...d, messages: [...d.messages, { role: "ai", text: socraticQ.question }] }) : d);
                                }, 300);
                              }
                              setSocraticQ(null);
                            }}
                            className="w-full py-3 bg-accent-dim hover:bg-accent text-text rounded-lg text-sm font-medium transition-colors"
                          >
                            Open Discussion
                          </button>
                          <div className="flex gap-2.5">
                            <button
                              onClick={() => generateSocratic(socraticQ.chapterNum)}
                              className="flex-1 py-2.5 border border-border text-text-muted rounded-lg text-xs hover:border-border-light hover:text-text transition-all"
                            >
                              Different question
                            </button>
                            <button
                              onClick={() => setSocraticQ(null)}
                              className="flex-1 py-2.5 border border-border text-text-muted rounded-lg text-xs hover:border-border-light hover:text-text transition-all"
                            >
                              Skip for now
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Discussion panel */}
            {discussion && (
              <div className="mt-6 bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex justify-between items-center">
                  <h4 className="font-display text-[15px]">Chapter {discussion.chapterNum}: {discussion.chapterTitle}</h4>
                  <button onClick={() => setDiscussion(null)} className="text-text-dim hover:text-text text-lg px-1">×</button>
                </div>
                <div className="px-5 py-5 max-h-[400px] overflow-y-auto flex flex-col gap-4">
                  {discussion.messages.length === 0 && (
                    <p className="text-center py-5 text-text-dim italic text-[13px]">
                      Ask a question about this chapter, share your thoughts, or explore its themes.
                    </p>
                  )}
                  {discussion.messages.map((m, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-display font-bold ${
                        m.role === "ai" ? "bg-accent-dim text-text" : "bg-surface-active text-text-muted"
                      }`}>
                        {m.role === "ai" ? "M" : (user?.displayName || "R")[0]}
                      </div>
                      <div className={`flex-1 text-sm leading-relaxed ${m.role === "ai" ? "text-text" : "text-text-muted"}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-accent-dim flex items-center justify-center text-xs font-display font-bold">M</div>
                      <div className="text-sm text-text-dim italic">Thinking...</div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <div className="px-5 py-4 border-t border-border flex gap-2.5">
                  <input
                    className="flex-1 px-4 py-2.5 bg-bg border border-border rounded-lg text-text font-body text-sm outline-none focus:border-accent-dim transition-colors"
                    placeholder="Share your thoughts on this chapter..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={sending || !chatInput.trim()}
                    className="px-5 py-2.5 bg-accent-dim hover:bg-accent text-text rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {tab === "themes" && (
          <div className="flex flex-col gap-4">
            {(book.themes || []).map((theme) => (
              <div key={theme} className="bg-surface border border-border rounded-xl p-5">
                <h4 className="font-display text-[15px] text-accent mb-1.5">{theme}</h4>
                <p className="text-[13px] text-text-muted leading-relaxed mb-3">{book.themeDescriptions?.[theme] || ""}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {(book.chapters || []).map((ch) => (
                    <div
                      key={ch.number}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono border ${
                        chaptersRead.includes(ch.number)
                          ? "border-accent-dim text-accent bg-accent/10"
                          : "border-border bg-surface-active text-text-dim"
                      }`}
                    >
                      {ch.number}
                    </div>
                  ))}
                </div>
                {chaptersRead.length > 0 && (
                  <button
                    onClick={() => loadThemeEvolution(theme)}
                    className="mt-3 px-4 py-2 border border-border text-text-muted rounded-md text-xs hover:border-border-light hover:text-text transition-all"
                  >
                    {themeLoading === theme ? "Analyzing..." : themeEvolution[theme] ? "Refresh analysis" : "Trace through my reading"}
                  </button>
                )}
                {themeEvolution[theme] && (
                  <div className="mt-2.5 px-4 py-3 border-l-2 border-accent-dim rounded-r-lg text-[13px] text-text-muted leading-relaxed bg-bg">
                    {themeEvolution[theme]}
                  </div>
                )}
              </div>
            ))}
            {(!book.themes || book.themes.length === 0) && (
              <div className="text-center py-16">
                <div className="text-5xl mb-4 opacity-30">🔍</div>
                <h3 className="font-display text-xl text-text-muted mb-2">Themes will appear here</h3>
                <p className="text-text-dim text-sm">Once a book primer is loaded, you can track how themes evolve across your reading.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" />
          <p className="text-text-dim text-sm italic">Loading...</p>
        </div>
      </div>
    }>
      <BookContent />
    </Suspense>
  );
}
