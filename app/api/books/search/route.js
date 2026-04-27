import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const encoded = encodeURIComponent(q.trim());
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encoded}&limit=8&fields=key,title,author_name,first_publish_year,subject,cover_i,number_of_pages_median,edition_count`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) throw new Error(`Open Library HTTP ${res.status}`);

    const data = await res.json();
    const results = (data.docs || [])
      .filter((d) => d.title && d.author_name?.length)
      .slice(0, 6)
      .map((d) => ({
        title: d.title,
        author: d.author_name?.[0] || "Unknown",
        year: d.first_publish_year || null,
        genre: d.subject?.slice(0, 2)?.join(", ") || "Literature",
        description: `${d.edition_count || "?"} editions${d.number_of_pages_median ? ` · ~${d.number_of_pages_median} pages` : ""}`,
        coverId: d.cover_i || null,
        olKey: d.key || null,
      }));

    return NextResponse.json({ results });
  } catch (e) {
    console.error("Open Library search error:", e);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}
