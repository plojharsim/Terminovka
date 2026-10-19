import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCESS_TTL_SECONDS, ANON_SUB, CORS_HEADERS, REFRESH_TTL_SECONDS, corsPreflight,
  oauthEnabled, oauthError, pkceMatches, signOAuthToken, verifyOAuthToken,
} from "@/lib/oauth";

export const dynamic = "force-dynamic";

async function issueTokens(userId: string, clientId: string, groups: unknown) {
  const grp = Array.isArray(groups) ? groups : [];
  const [access, refresh] = await Promise.all([
    signOAuthToken("access", { sub: userId, cid: clientId, grp }, ACCESS_TTL_SECONDS),
    signOAuthToken("refresh", { sub: userId, cid: clientId, grp }, REFRESH_TTL_SECONDS),
  ]);
  return NextResponse.json(
    { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_SECONDS, refresh_token: refresh, scope: "terminovka" },
    { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } }
  );
}

async function activeUser(userId: string) {
  if (userId === ANON_SUB) return true;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  return !!user?.isActive;
}

export async function POST(request: NextRequest) {
  if (!oauthEnabled()) return oauthError("server_error", "OAuth není nakonfigurováno", 503);

  const form = await request.formData().catch(() => null);
  if (!form) return oauthError("invalid_request", "Očekáván formulář application/x-www-form-urlencoded");
  const get = (k: string) => (form.get(k) as string | null) || "";

  const grantType = get("grant_type");
  const clientId = get("client_id");

  if (grantType === "authorization_code") {
    const code = await verifyOAuthToken(get("code"), "code");
    if (!code) return oauthError("invalid_grant", "Neplatný nebo prošlý kód");
    if (code.cid !== clientId || code.ru !== get("redirect_uri")) {
      return oauthError("invalid_grant", "Kód nepatří k tomuto klientovi / redirect_uri");
    }
    const verifier = get("code_verifier");
    if (!verifier || !pkceMatches(verifier, String(code.cc))) {
      return oauthError("invalid_grant", "PKCE ověření selhalo");
    }
    if (!(await activeUser(code.sub))) return oauthError("invalid_grant", "Uživatel není aktivní");
    return issueTokens(code.sub, clientId, code.grp);
  }

  if (grantType === "refresh_token") {
    const refresh = await verifyOAuthToken(get("refresh_token"), "refresh");
    if (!refresh || refresh.cid !== clientId) return oauthError("invalid_grant", "Neplatný refresh token");
    if (!(await activeUser(refresh.sub))) return oauthError("invalid_grant", "Uživatel není aktivní");
    return issueTokens(refresh.sub, clientId, refresh.grp);
  }

  return oauthError("unsupported_grant_type", "Podporováno: authorization_code, refresh_token");
}

export const OPTIONS = corsPreflight;
