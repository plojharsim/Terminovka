import { NextResponse } from "next/server";
import { CORS_HEADERS, corsPreflight, getOrigin } from "@/lib/oauth";

export const dynamic = "force-dynamic";

// Obsluhuje /.well-known/oauth-protected-resource i variantu s cestou (…/api/mcp).
export async function GET(request: Request) {
  const origin = getOrigin(request);
  return NextResponse.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      scopes_supported: ["terminovka"],
      bearer_methods_supported: ["header"],
    },
    { headers: CORS_HEADERS }
  );
}

export const OPTIONS = corsPreflight;
