import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, corsPreflight, isAllowedRedirectUri, oauthEnabled, oauthError, signOAuthToken } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Dynamická registrace klienta (RFC 7591). client_id je podepsaný JWT s redirect URI,
// takže si server nic neukládá.
export async function POST(request: NextRequest) {
  if (!oauthEnabled()) return oauthError("server_error", "OAuth není nakonfigurováno", 503);

  const body = await request.json().catch(() => null);
  const redirectUris: unknown = body?.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.length > 10 ||
    !redirectUris.every((u) => typeof u === "string" && isAllowedRedirectUri(u))
  ) {
    return oauthError("invalid_redirect_uri", "Neplatné redirect_uris");
  }

  const clientName = String(body?.client_name || "AI klient").slice(0, 80);
  const clientId = await signOAuthToken("client", { sub: "client", redirect_uris: redirectUris, name: clientName });

  return NextResponse.json(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    },
    { status: 201, headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } }
  );
}

export const OPTIONS = corsPreflight;
