import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { ANON_SUB, oauthEnabled, signOAuthToken, verifyOAuthToken } from "@/lib/oauth";

export const dynamic = "force-dynamic";

async function resolveClient(clientId: string | null, redirectUri: string | null) {
  if (!clientId) return null;
  const client = await verifyOAuthToken(clientId, "client");
  if (!client) return null;
  const uris = client.redirect_uris as string[];
  if (!redirectUri || !uris.includes(redirectUri)) return null;
  return { name: String(client.name || "AI klient"), host: new URL(redirectUri).host };
}

// Údaje pro souhlasovou stránku: kdo žádá o přístup a kdo je právě přihlášen.
export async function GET(request: NextRequest) {
  if (!oauthEnabled()) return NextResponse.json({ error: "OAuth není nakonfigurováno" }, { status: 503 });
  const sp = request.nextUrl.searchParams;
  const client = await resolveClient(sp.get("client_id"), sp.get("redirect_uri"));
  if (!client) return NextResponse.json({ error: "Neplatný klient nebo redirect_uri" }, { status: 400 });

  const user = await getCurrentUser();
  const groups = await prisma.studentGroup.findMany({
    where: { isDefaultAll: false },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ client, user: user ? { name: user.name, email: user.email } : null, groups });
}

// Udělení souhlasu: přihlášenou relací (cookie), nebo e-mailem a heslem. Vrací adresu pro přesměrování.
export async function POST(request: NextRequest) {
  if (!oauthEnabled()) return NextResponse.json({ error: "OAuth není nakonfigurováno" }, { status: 503 });
  const b = await request.json().catch(() => null);
  if (!b) return NextResponse.json({ error: "Neplatný požadavek" }, { status: 400 });

  const client = await resolveClient(b.client_id, b.redirect_uri);
  if (!client) return NextResponse.json({ error: "Neplatný klient nebo redirect_uri" }, { status: 400 });
  if (b.response_type !== "code" || b.code_challenge_method !== "S256" || !b.code_challenge) {
    return NextResponse.json({ error: "Vyžadován response_type=code a PKCE (S256)" }, { status: 400 });
  }

  // Skupiny, které AI uvidí (celá třída je vždy zahrnuta). Ověříme je proti databázi.
  const requested: string[] = Array.isArray(b.groups) ? b.groups.map(String) : [];
  const validGroups = await prisma.studentGroup.findMany({
    where: { id: { in: requested }, isDefaultAll: false },
    select: { id: true },
  });
  const grp = validGroups.map((g) => g.id);

  let userId: string | null = null;
  if (b.anonymous === true) {
    userId = ANON_SUB; // bez přihlášení – pouze čtení
  } else if (b.email && b.password) {
    const user = await prisma.user.findUnique({ where: { email: String(b.email).trim().toLowerCase() } });
    if (!user || !user.isActive || !(await bcrypt.compare(String(b.password), user.passwordHash))) {
      return NextResponse.json({ error: "Neplatný e-mail nebo heslo" }, { status: 401 });
    }
    userId = user.id;
  } else {
    userId = (await getCurrentUser())?.userId ?? null;
  }
  if (!userId) return NextResponse.json({ error: "Přihlaste se" }, { status: 401 });

  const code = await signOAuthToken(
    "code",
    { sub: userId, cid: b.client_id, ru: b.redirect_uri, cc: b.code_challenge, grp },
    300
  );
  const redirect = new URL(b.redirect_uri);
  redirect.searchParams.set("code", code);
  if (b.state) redirect.searchParams.set("state", String(b.state));
  return NextResponse.json({ redirect: redirect.toString() });
}
