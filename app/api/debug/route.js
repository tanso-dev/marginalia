import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const checks = {};

  // Check 1: Environment variables exist
  checks.env = {
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 15) + "...",
  };

  // Check 2: Database connection
  try {
    const { createClient } = await import("@libsql/client");
    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const result = await db.execute("SELECT COUNT(*) as count FROM users");
    checks.database = { ok: true, userCount: Number(result.rows[0].count) };
  } catch (e) {
    checks.database = { ok: false, error: e.message, stack: e.stack?.split("\n").slice(0, 3) };
  }

  // Check 3: JWT/jose
  try {
    const { SignJWT, jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "test");
    const token = await new SignJWT({ test: true })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(secret);
    const { payload } = await jwtVerify(token, secret);
    checks.jwt = { ok: true, verified: payload.test === true };
  } catch (e) {
    checks.jwt = { ok: false, error: e.message };
  }

  // Check 4: bcrypt
  try {
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("test", 10);
    const match = await bcrypt.compare("test", hash);
    checks.bcrypt = { ok: true, match };
  } catch (e) {
    checks.bcrypt = { ok: false, error: e.message };
  }

  // Check 5: Cookie reading
  try {
    const token = req.cookies?.get("token")?.value;
    checks.cookies = { ok: true, hasToken: !!token };
  } catch (e) {
    checks.cookies = { ok: false, error: e.message };
  }

  return NextResponse.json(checks);
}
