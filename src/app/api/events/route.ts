import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { validateEventAgainstTimetable } from "@/lib/timetable";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const group = searchParams.get("group"); // single group code or ID
    const type = searchParams.get("type");
    const subjectId = searchParams.get("subjectId");
    const search = searchParams.get("search");

    const where: any = {};

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (subjectId && subjectId !== "ALL") {
      if (subjectId === "none") {
        where.subjectId = null;
      } else {
        where.subjectId = subjectId;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        subject: true,
        group: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [
        { date: "asc" },
        { period: "asc" },
        { startTime: "asc" },
      ],
    });

    // If group filter is provided and not "ALL", filter out events intended for other specific groups
    let filtered = events;
    if (group && group !== "ALL") {
      filtered = events.filter((ev) => {
        if (!ev.groupId || ev.group?.isDefaultAll) return true;
        return ev.groupId === group || ev.group?.code === group;
      });
    }

    return NextResponse.json({ events: filtered });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json({ error: "Chyba při načítání událostí" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Pro přidání události se musíte přihlásit." }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      type,
      date, // YYYY-MM-DD
      subjectId,
      groupId,
      hasSpecificTime,
      startTime,
      endTime,
      period,
      description,
      attachmentUrl,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Vyplňte název události" }, { status: 400 });
    }

    if (!type || !["TEST", "HOMEWORK", "DEADLINE", "OTHER"].includes(type)) {
      return NextResponse.json({ error: "Neplatný typ události" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Vyberte datum události" }, { status: 400 });
    }

    // Timetable Validation Rule: strictly enforced for TEST (písemky).
    // For DEADLINE and OTHER, allow adding even if the subject is not taught that day (e.g. deadline odevzdání).
    const cleanSubjectId = subjectId && subjectId !== "none" ? subjectId : null;
    const cleanGroupId = groupId && groupId !== "ALL" ? groupId : null;

    const requiresTimetableLesson = type === "TEST";
    const recurrenceType = body.recurrenceType || "NONE"; // "NONE" | "WEEKLY" | "BIWEEKLY" | "MONTHLY"
    const recurrenceCount = Math.min(Math.max(Number(body.recurrenceCount) || 1, 1), 20);

    // Compute all target dates (YYYY-MM-DD strings)
    const datesToCreate: string[] = [date];
    if (recurrenceType !== "NONE" && recurrenceCount > 1) {
      const [startYear, startMonth, startDay] = date.split("-").map(Number);
      for (let i = 1; i < recurrenceCount; i++) {
        const nextDate = new Date(startYear, startMonth - 1, startDay);
        if (recurrenceType === "WEEKLY") {
          nextDate.setDate(nextDate.getDate() + i * 7);
        } else if (recurrenceType === "BIWEEKLY") {
          nextDate.setDate(nextDate.getDate() + i * 14);
        } else if (recurrenceType === "MONTHLY") {
          nextDate.setMonth(nextDate.getMonth() + i);
        }
        const yStr = nextDate.getFullYear();
        const mStr = String(nextDate.getMonth() + 1).padStart(2, "0");
        const dStr = String(nextDate.getDate()).padStart(2, "0");
        datesToCreate.push(`${yStr}-${mStr}-${dStr}`);
      }
    }

    const createdEvents = [];

    for (const curDateStr of datesToCreate) {
      let isCurTimetableMatch = true;

      if (cleanSubjectId) {
        const timetableCheck = await validateEventAgainstTimetable(
          curDateStr,
          cleanSubjectId,
          cleanGroupId
        );

        if (!timetableCheck.valid) {
          if (requiresTimetableLesson) {
            // For TEST, if any recurring date fails (e.g. alternating week), reject with helpful message
            return NextResponse.json(
              {
                error:
                  timetableCheck.message ||
                  `Předmět se v den ${curDateStr} podle rozvrhu nevyučuje.`,
              },
              { status: 400 }
            );
          }
          isCurTimetableMatch = false;
        }
      }

      const eventDate = new Date(`${curDateStr}T00:00:00.000Z`);
      const finalPeriod = isCurTimetableMatch && period ? Number(period) : null;
      const finalHasSpecificTime = isCurTimetableMatch ? Boolean(hasSpecificTime) : false;
      const finalStartTime = isCurTimetableMatch && hasSpecificTime ? startTime || null : null;
      const finalEndTime = isCurTimetableMatch && hasSpecificTime ? endTime || null : null;

      const ev = await prisma.event.create({
        data: {
          title: title.trim(),
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
          createdById: user.userId,
        },
        include: {
          subject: true,
          group: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      createdEvents.push(ev);
    }

    return NextResponse.json(
      { success: true, event: createdEvents[0], count: createdEvents.length },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: error?.message || "Chyba při ukládání události" },
      { status: 500 }
    );
  }
}
