import { SignJWT, jwtVerify } from "jose";
import { createHash } from "crypto";
import { NextResponse } from "next/server";

// Bezstavové OAuth 2.1 pro MCP konektory (web Claude): dynamická registrace klienta,
// authorization code + PKCE (S256), access a refresh tokeny. Vše jsou podepsané JWT
// (jiný klíč než přihlašovací cookie), takže nepotřebujeme žádné tabulky v databázi.

export type OAuthTokenType = "client" | "code" | "access" | "refresh";

export const ACCESS_TTL_SECONDS = 60 * 60; // 1 hodina
export const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dní

function getKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null; // bez AUTH_SECRET OAuth záměrně nefunguje (žádný veřejný fallback)
  return new TextEncoder().encode(`terminovka-oauth:${secret}`);
}

export function oauthEnabled(): boolean {
  return getKey() !== null;
}

export async function signOAuthToken(
  typ: OAuthTokenType,
  claims: Record<string, unknown>,
  ttlSeconds?: number
): Promise<string> {
  const key = getKey();
  if (!key) throw new Error("AUTH_SECRET není nastaven");
  const jwt = new SignJWT({ ...claims, typ }).setProtectedHeader({ alg: "HS256" }).setIssuedAt();
  if (ttlSeconds) jwt.setExpirationTime(`${ttlSeconds}s`);
  return jwt.sign(key);
}

export async function verifyOAuthToken(
  token: string,
  typ: OAuthTokenType
): Promise<(Record<string, unknown> & { sub: string }) | null> {
  const key = getKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.typ !== typ) return null;
    return payload as unknown as Record<string, unknown> & { sub: string };
  } catch {
    return null;
  }
}

export function pkceMatches(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return computed === challenge;
}

export function isAllowedRedirectUri(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

export function getOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return `${proto}://${host}`;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
};

export function corsPreflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } }
  );
}
