import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const checks = {};

  // Check API key format
  const key = process.env.ANTHROPIC_API_KEY || "";
  checks.keyFormat = {
    exists: !!key,
    startsWithSk: key.startsWith("sk-"),
    length: key.length,
  };

  // Try a minimal API call
  try {
    const start = Date.now();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [{ role: "user", content: "Say hello in exactly 3 words." }],
      }),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text();
      checks.api = {
        ok: false,
        status: res.status,
        statusText: res.statusText,
        error: errText.substring(0, 500),
        elapsedMs: elapsed,
      };
    } else {
      const data = await res.json();
      checks.api = {
        ok: true,
        response: data.content?.[0]?.text || "no text",
        model: data.model,
        elapsedMs: elapsed,
      };
    }
  } catch (e) {
    checks.api = { ok: false, error: e.message };
  }

  return NextResponse.json(checks);
}
