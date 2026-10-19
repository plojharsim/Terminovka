import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashApiToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Správa tokenů je možná jen z přihlášené relace (cookie), ne přes samotný token.
async function requireCookieUser() {
  const { headers } = await import("next/headers");
  if ((await headers()).get("authorization")) return null;
  return getCurrentUser();
}

export async function GET() {
  const user = await requireCookieUser();
  if (!user) return NextResponse.json({ error: "Musíte být přihlášeni." }, { status: 401 });

  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.userId },
    select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ tokens });
}

export async function POST(request: Request) {
  const user = await requireCookieUser();
  if (!user) return NextResponse.json({ error: "Musíte být přihlášeni." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim().slice(0, 60) || "AI přístup";

  const count = await prisma.apiToken.count({ where: { userId: user.userId } });
  if (count >= 10) {
    return NextResponse.json({ error: "Maximálně 10 tokenů na uživatele." }, { status: 400 });
  }

  const token = `trm_${randomBytes(32).toString("base64url")}`;
  const created = await prisma.apiToken.create({
    data: {
      name,
      tokenHash: hashApiToken(token),
      prefix: token.slice(0, 10),
      userId: user.userId,
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });

  // Celý token se zobrazí pouze jednou – v databázi je jen jeho hash.
  return NextResponse.json({ token, ...created }, { status: 201 });
}
