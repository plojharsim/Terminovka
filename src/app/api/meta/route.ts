import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERIOD_TIMES, DAY_NAMES, getISOWeekNumber, getWeekType } from "@/lib/timetable";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [subjects, groups, scheduleSlots] = await Promise.all([
      prisma.subject.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.studentGroup.findMany({
        orderBy: [{ isDefaultAll: "desc" }, { name: "asc" }],
      }),
      prisma.scheduleSlot.findMany({
        include: {
          subject: true,
          group: true,
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { period: "asc" },
        ],
      }),
    ]);

    const now = new Date();
    const currentWeekNumber = getISOWeekNumber(now);
    const currentWeekType = getWeekType(now);

    return NextResponse.json({
      subjects,
      groups,
      scheduleSlots,
      periodTimes: PERIOD_TIMES,
      dayNames: DAY_NAMES,
      currentWeekNumber,
      currentWeekType,
    });
  } catch (error) {
    console.error("Meta fetch error:", error);
    return NextResponse.json({ error: "Chyba při načítání metadat" }, { status: 500 });
  }
}
