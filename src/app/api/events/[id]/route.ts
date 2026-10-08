import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { validateEventAgainstTimetable } from "@/lib/timetable";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Musíte být přihlášeni." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Událost nebyla nalezena" }, { status: 404 });
    }

    // Permission check: admin or creator (or editor)
    if (user.role !== "ADMIN" && existing.createdById !== user.userId) {
      return NextResponse.json(
        { error: "Nemáte oprávnění upravovat události cizích editorů" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      type,
      date,
      subjectId,
      groupId,
      hasSpecificTime,
      startTime,
      endTime,
      period,
      description,
      attachmentUrl,
    } = body;

    const cleanSubjectId = subjectId && subjectId !== "none" ? subjectId : null;
    const cleanGroupId = groupId && groupId !== "ALL" ? groupId : null;

    const requiresTimetableLesson = type === "TEST";
    let isTimetableMatch = true;

    if (cleanSubjectId) {
      const timetableCheck = await validateEventAgainstTimetable(
        date,
        cleanSubjectId,
        cleanGroupId
      );

      if (!timetableCheck.valid) {
        if (requiresTimetableLesson) {
          return NextResponse.json(
            {
              error:
                timetableCheck.message ||
                "V tento den se daný předmět v rozvrhu nevyučuje! Pro test zvolte den, kdy máte hodinu.",
            },
            { status: 400 }
          );
        }
        isTimetableMatch = false;
      }
    }

    const eventDate = new Date(`${date}T00:00:00.000Z`);

    const finalPeriod = isTimetableMatch && period ? Number(period) : null;
    const finalHasSpecificTime = isTimetableMatch ? Boolean(hasSpecificTime) : false;
    const finalStartTime = isTimetableMatch && hasSpecificTime ? startTime || null : null;
    const finalEndTime = isTimetableMatch && hasSpecificTime ? endTime || null : null;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: title?.trim(),
        type,
        date: eventDate,
        hasSpecificTime: finalHasSpecificTime,
        startTime: finalStartTime,
        endTime: finalEndTime,
        period: finalPeriod,
        description: description ? description.trim() : null,
        attachmentUrl: attachmentUrl ? attachmentUrl.trim() : null,
        subjectId: cleanSubjectId,
        groupId: cleanGroupId,
      },
      include: {
        subject: true,
        group: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: error?.message || "Chyba při úpravě události" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Musíte být přihlášeni." }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Událost nebyla nalezena" }, { status: 404 });
    }

    // Permission check: admin or creator
    if (user.role !== "ADMIN" && existing.createdById !== user.userId) {
      return NextResponse.json(
        { error: "Nemáte oprávnění smazat tuto událost" },
        { status: 403 }
      );
    }

    await prisma.event.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: error?.message || "Chyba při mazání události" },
      { status: 500 }
    );
  }
}
