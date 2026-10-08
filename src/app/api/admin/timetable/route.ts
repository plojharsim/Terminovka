import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PERIOD_TIMES } from "@/lib/timetable";

export async function GET() {
  try {
    const slots = await prisma.scheduleSlot.findMany({
      include: {
        subject: true,
        group: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { period: "asc" }],
    });
    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json({ error: "Chyba při načítání rozvrhu" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { dayOfWeek, period, subjectId, groupId, room, startTime, endTime, weekType } = await request.json();

    if (!dayOfWeek || !period || !subjectId) {
      return NextResponse.json(
        { error: "Vyplňte den v týdnu, hodinu a předmět." },
        { status: 400 }
      );
    }

    const defaultTimes = PERIOD_TIMES[Number(period)] || { startTime: "08:00", endTime: "08:45" };

    const newSlot = await prisma.scheduleSlot.create({
      data: {
        dayOfWeek: Number(dayOfWeek),
        period: Number(period),
        subjectId,
        groupId: groupId && groupId !== "ALL" ? groupId : null,
        room: room?.trim() || null,
        weekType: ["EVEN", "ODD", "SELF_STUDY"].includes(weekType) ? weekType : "ALL",
        startTime: startTime || defaultTimes.startTime,
        endTime: endTime || defaultTimes.endTime,
      },
      include: {
        subject: true,
        group: true,
      },
    });

    return NextResponse.json({ success: true, slot: newSlot }, { status: 201 });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED" || error?.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Nemáte administrátorská oprávnění" }, { status: 403 });
    }
    return NextResponse.json({ error: "Chyba při ukládání hodiny rozvrhu" }, { status: 500 });
  }
}
