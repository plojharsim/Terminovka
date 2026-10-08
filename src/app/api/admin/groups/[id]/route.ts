import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { name, code } = await request.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Vyplňte název a zkratku skupiny." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Prevent modifying code of root "Celá třída"
    const targetGroup = await prisma.studentGroup.findUnique({ where: { id } });
    if (!targetGroup) {
      return NextResponse.json({ error: "Skupina nebyla nalezena." }, { status: 404 });
    }

    const group = await prisma.studentGroup.update({
      where: { id },
      data: {
        name: name.trim(),
        code: targetGroup.isDefaultAll ? targetGroup.code : cleanCode,
      },
    });

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Nemáte administrátorská oprávnění" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Skupinu se nepodařilo upravit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const group = await prisma.studentGroup.findUnique({
      where: { id },
    });

    if (!group) {
      return NextResponse.json(
        { error: "Skupina nebyla nalezena." },
        { status: 404 }
      );
    }

    if (group.isDefaultAll) {
      return NextResponse.json(
        { error: "Výchozí skupinu 'Celá třída' nelze smazat." },
        { status: 400 }
      );
    }

    await prisma.studentGroup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Nemáte administrátorská oprávnění" },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: "Skupinu se nepodařilo smazat" },
      { status: 500 }
    );
  }
}
