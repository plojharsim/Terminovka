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
    const { name, code, color, teacher, defaultRoom } = await request.json();

    if (!name || !code) {
      return NextResponse.json(
        { error: "Vyplňte název a zkratku předmětu." },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Check if code conflicts with another subject
    const existing = await prisma.subject.findFirst({
      where: {
        code: cleanCode,
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Předmět se zkratkou "${cleanCode}" již existuje.` },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: name.trim(),
        code: cleanCode,
        color: color || "#3b82f6",
        teacher: teacher?.trim() || null,
        defaultRoom: defaultRoom?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Nemáte administrátorská oprávnění" },
        { status: 403 }
      );
    }
    console.error("Error updating subject:", error);
    return NextResponse.json(
      { error: "Předmět se nepodařilo upravit" },
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

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Předmět nebyl nalezen." },
        { status: 404 }
      );
    }

    // Delete subject (ScheduleSlot cascades, Event sets subjectId to null)
    await prisma.subject.delete({
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
    console.error("Error deleting subject:", error);
    return NextResponse.json(
      { error: "Předmět se nepodařilo smazat" },
      { status: 500 }
    );
  }
}
