import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { name, code, color, teacher, defaultRoom } = await request.json();

    if (!name || !code) {
      return NextResponse.json({ error: "Vyplňte název a zkratku předmětu." }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        color: color || "#3b82f6",
        teacher: teacher?.trim() || null,
        defaultRoom: defaultRoom?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, subject }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Nemáte administrátorská oprávnění" }, { status: 403 });
    }
    return NextResponse.json({ error: "Předmět se nepodařilo vytvořit" }, { status: 500 });
  }
}
