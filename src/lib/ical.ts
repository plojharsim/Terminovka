import ical, { ICalAlarmType } from "ical-generator";
import { prisma } from "./prisma";

export interface ICalOptions {
  groupIds?: string[];
  types?: string[];
}

export async function generateICalFeed(options: ICalOptions = {}): Promise<string> {
  const { groupIds, types } = options;

  // Build query where clause
  const whereClause: any = {};

  if (types && types.length > 0) {
    whereClause.type = { in: types };
  }

  // Fetch all events with related subject, group, and creator
  const events = await prisma.event.findMany({
    where: whereClause,
    include: {
      subject: true,
      group: true,
      createdBy: {
        select: { name: true },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  // Filter in memory for group matching
  const filteredEvents = events.filter((ev) => {
    // If event has no group or is for all students (Celá třída), ALWAYS include it!
    if (!ev.groupId || ev.group?.isDefaultAll) return true;

    // If no groups filter was provided at all in query (undefined), include all group events too
    if (groupIds === undefined) return true;

    // If specific groups filter was provided, check if the event's group matches any requested group
    return groupIds.includes(ev.groupId) || (ev.group && groupIds.includes(ev.group.code));
  });

  const calendar = ical({
    name: "Termínovka 1.B SSPŠ",
    description: "Školní testy, úkoly, deadliny a důležité události třídy 1.B SSPŠ.",
    timezone: "Europe/Prague",
    prodId: { company: "Termínovka 1.B", product: "SSPŠ", language: "CS" },
  });

  for (const ev of filteredEvents) {
    const eventDate = new Date(ev.date);
    const dateYMD = eventDate.toISOString().split("T")[0]; // YYYY-MM-DD

    let start: Date;
    let end: Date;
    let allDay = false;

    if (ev.hasSpecificTime && ev.startTime && ev.endTime) {
      const [startH, startM] = ev.startTime.split(":").map(Number);
      const [endH, endM] = ev.endTime.split(":").map(Number);

      start = new Date(eventDate);
      start.setHours(startH, startM, 0, 0);

      end = new Date(eventDate);
      end.setHours(endH, endM, 0, 0);
    } else {
      allDay = true;
      start = new Date(eventDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(eventDate);
      end.setHours(23, 59, 59, 999);
    }

    const typePrefixes: Record<string, string> = {
      TEST: "🔴 PÍSEMKA",
      HOMEWORK: "📘 ÚKOL",
      DEADLINE: "📘 ÚKOL",
      OTHER: "📌 UDÁLOST",
    };

    const typeName = typePrefixes[ev.type] || "📌 UDÁLOST";
    const subjectPrefix = ev.subject ? `[${ev.subject.name}] ` : "";
    const groupNotice = ev.group && !ev.group.isDefaultAll ? ` (${ev.group.name})` : "";
    const weightNotice = ev.weight != null ? ` [Váha ${ev.weight}]` : "";
    const summary = `${typeName}: ${subjectPrefix}${ev.title}${weightNotice}${groupNotice}`;

    let descriptionLines = [];
    if (ev.description) {
      descriptionLines.push(ev.description);
      descriptionLines.push("");
    }
    if (ev.weight != null) {
      descriptionLines.push(`Předpokládaná váha známky: ${ev.weight}`);
    }
    if (ev.subject) {
      descriptionLines.push(`Předmět: ${ev.subject.name} (${ev.subject.code})`);
      if (ev.subject.teacher) descriptionLines.push(`Vyučující: ${ev.subject.teacher}`);
    }
    if (ev.group) {
      descriptionLines.push(`Skupina: ${ev.group.name}`);
    }
    if (ev.period) {
      descriptionLines.push(`Vyučovací hodina: ${ev.period}. hodina (${ev.startTime} - ${ev.endTime})`);
    }
    if (ev.attachmentUrl) {
      descriptionLines.push(`Odkaz / Zadání: ${ev.attachmentUrl}`);
    }
    descriptionLines.push(`Vložil: ${ev.createdBy.name}`);

    // Only output classroom location when event has a scheduled period
    const location = ev.period && ev.subject?.defaultRoom ? `Učebna ${ev.subject.defaultRoom}` : undefined;

    const calendarEvent = calendar.createEvent({
      id: ev.id,
      start,
      end,
      allDay,
      summary,
      description: descriptionLines.join("\n"),
      location,
      url: ev.attachmentUrl || undefined,
    });

    // Add reminder alarm: 12 hours before
    calendarEvent.createAlarm({
      type: ICalAlarmType.display,
      trigger: 60 * 60 * 12, // 12 hours before
      description: `Připomenutí: ${summary}`,
    });
  }

  return calendar.toString();
}
