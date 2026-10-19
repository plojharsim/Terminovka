import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if ((await headers()).get("authorization")) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Musíte být přihlášeni." }, { status: 401 });

  const { id } = await params;
  const result = await prisma.apiToken.deleteMany({ where: { id, userId: user.userId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Token nenalezen" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
