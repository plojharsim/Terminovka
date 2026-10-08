import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { name, code } = await request.json();

    if (!name || !code) {
      return NextResponse.json({ error: "Vyplňte název a zkratku skupiny." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const group = await prisma.studentGroup.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        isDefaultAll: false,
      },
    });

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Nemáte administrátorská oprávnění" }, { status: 403 });
    }
    return NextResponse.json({ error: "Skupinu se nepodařilo vytvořit" }, { status: 500 });
  }
}
