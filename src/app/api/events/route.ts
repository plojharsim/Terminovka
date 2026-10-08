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

    // If it's a task on a day where the subject isn't taught in the timetable,
    // don't assign a timetable lesson period
    const finalPeriod = isTimetableMatch && period ? Number(period) : null;
    const finalHasSpecificTime = isTimetableMatch ? Boolean(hasSpecificTime) : false;
    const finalStartTime = isTimetableMatch && hasSpecificTime ? startTime || null : null;
    const finalEndTime = isTimetableMatch && hasSpecificTime ? endTime || null : null;

    const newEvent = await prisma.event.create({
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

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: error?.message || "Chyba při ukládání události" },
      { status: 500 }
    );
  }
}
