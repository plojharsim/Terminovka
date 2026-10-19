import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { parseGroupIds } from "@/lib/groups";

export const dynamic = "force-dynamic";

// Skupiny, které si přihlášený uživatel zvolil. Ukládají se na serveru, aby je mohla vidět i AI (MCP).
async function cookieUser() {
  if ((await headers()).get("authorization")) return null; // jen z webu, ne přes AI token
  return getCurrentUser();
}

export async function GET() {
  const user = await cookieUser();
  if (!user) return NextResponse.json({ error: "Musíte být přihlášeni." }, { status: 401 });
  const row = await prisma.user.findUnique({ where: { id: user.userId }, select: { selectedGroupIds: true } });
  return NextResponse.json({ groupIds: parseGroupIds(row?.selectedGroupIds) });
}

export async function PUT(request: NextRequest) {
  const user = await cookieUser();
  if (!user) return NextResponse.json({ error: "Musíte být přihlášeni." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.groupIds)) {
    return NextResponse.json({ error: "Očekáváno pole groupIds" }, { status: 400 });
  }

  const valid = await prisma.studentGroup.findMany({
    where: { id: { in: body.groupIds.map(String) }, isDefaultAll: false },
    select: { id: true },
  });
  const groupIds = valid.map((g) => g.id);
  await prisma.user.update({ where: { id: user.userId }, data: { selectedGroupIds: JSON.stringify(groupIds) } });
  return NextResponse.json({ groupIds });
}
