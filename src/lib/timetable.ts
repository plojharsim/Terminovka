import { prisma } from "./prisma";

export const PERIOD_TIMES: Record<number, { startTime: string; endTime: string }> = {
  1: { startTime: "08:00", endTime: "08:45" },
  2: { startTime: "08:55", endTime: "09:40" },
  3: { startTime: "10:00", endTime: "10:45" },
  4: { startTime: "10:55", endTime: "11:40" },
  5: { startTime: "11:50", endTime: "12:35" },
  6: { startTime: "12:45", endTime: "13:30" },
  7: { startTime: "13:40", endTime: "14:25" },
  8: { startTime: "14:35", endTime: "15:20" },
  9: { startTime: "15:30", endTime: "16:15" },
  10: { startTime: "16:20", endTime: "17:05" },
};

export const DAY_NAMES: Record<number, string> = {
  1: "Pondělí",
  2: "Úterý",
  3: "Středa",
  4: "Čtvrtek",
  5: "Pátek",
};

export const CZECH_DAYS = [
  "Neděle",
  "Pondělí",
  "Úterý",
  "Středa",
  "Čtvrtek",
  "Pátek",
  "Sobota",
];

/**
 * Calculates ISO 8601 week number (1-53).
 */
export function getISOWeekNumber(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : new Date(d);
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNr);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Returns "EVEN" (Sudý) or "ODD" (Lichý) for a given date.
 */
export function getWeekType(d: Date | string): "EVEN" | "ODD" {
  const weekNum = getISOWeekNumber(d);
  return weekNum % 2 === 0 ? "EVEN" : "ODD";
}

export function getWeekTypeLabel(weekType: "ALL" | "EVEN" | "ODD" | "SELF_STUDY" | string): string {
  switch (weekType) {
    case "EVEN":
      return "Sudý týden";
    case "ODD":
      return "Lichý týden";
    case "SELF_STUDY":
      return "Samostudium (S)";
    default:
      return "Každý týden";
  }
}

export function getDayOfWeekFromDateString(dateStr: string): number {
  // dateStr is expected to be YYYY-MM-DD
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay(); // 0 = Ne, 1 = Po, 2 = Út, 3 = St, 4 = Čt, 5 = Pá, 6 = So
}

export interface TimetableValidationResult {
  valid: boolean;
  message?: string;
  slots: Array<{
    id: string;
    period: number;
    startTime: string;
    endTime: string;
    room?: string | null;
    weekType?: string;
    groupName?: string;
  }>;
}

/**
 * Validates whether a subject is scheduled on the given date and group,
 * taking into account odd / even alternating weeks (Sudý / Lichý týden).
 */
export async function validateEventAgainstTimetable(
  dateStr: string,
  subjectId: string | null | undefined,
  groupId?: string | null
): Promise<TimetableValidationResult> {
  // If "Bez předmětu", no timetable restriction applies
  if (!subjectId || subjectId === "none" || subjectId.trim() === "") {
    return { valid: true, slots: [] };
  }

  const jsDay = getDayOfWeekFromDateString(dateStr);

  if (jsDay === 0 || jsDay === 6) {
    return {
      valid: false,
      message: `Vybrané datum připadá na víkend (${CZECH_DAYS[jsDay]}), kdy neprobíhá běžná výuka rozvrhu.`,
      slots: [],
    };
  }

  const [year, month, day] = dateStr.split("-").map(Number);
  const targetDate = new Date(year, month - 1, day);
  const eventWeekType = getWeekType(targetDate);
  const eventWeekNumber = getISOWeekNumber(targetDate);

  // Find all schedule slots for this day and subject
  const slots = await prisma.scheduleSlot.findMany({
    where: {
      dayOfWeek: jsDay,
      subjectId: subjectId,
    },
    include: {
      subject: true,
      group: true,
    },
    orderBy: {
      period: "asc",
    },
  });

  if (slots.length === 0) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    const subjectName = subject ? subject.name : "Vybraný předmět";
    return {
      valid: false,
      message: `${subjectName} se v ${CZECH_DAYS[jsDay]} podle školního rozvrhu nevyučuje!`,
      slots: [],
    };
  }

  // Filter slots matching the week parity (ALL, SELF_STUDY, or matching EVEN/ODD)
  const weekMatchingSlots = slots.filter(
    (s) => s.weekType === "ALL" || s.weekType === "SELF_STUDY" || s.weekType === eventWeekType
  );

  if (weekMatchingSlots.length === 0) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    const subjectName = subject ? subject.name : "Vybraný předmět";
    const parityCz = eventWeekType === "EVEN" ? "sudý" : "lichý";
    const oppositeCz = eventWeekType === "EVEN" ? "lichém" : "sudém";
    return {
      valid: false,
      message: `${subjectName} se v ${CZECH_DAYS[jsDay]} vyučuje pouze v ${oppositeCz} týdnu! Vybrané datum (${day}. ${month}.) spadá do ${eventWeekNumber}. týdne (${parityCz} týden).`,
      slots: [],
    };
  }

  // If a specific group is selected, filter by that group or slots applicable to all
  let matchingSlots = weekMatchingSlots;
  if (groupId && groupId !== "ALL") {
    matchingSlots = weekMatchingSlots.filter(
      (s) => !s.groupId || s.group?.isDefaultAll || s.groupId === groupId
    );

    if (matchingSlots.length === 0) {
      const group = await prisma.studentGroup.findUnique({ where: { id: groupId } });
      const groupName = group ? group.name : "vybranou skupinu";
      return {
        valid: false,
        message: `Pro skupinu „${groupName}“ není v ${CZECH_DAYS[jsDay]} tento předmět v rozvrhu zařazen.`,
        slots: [],
      };
    }
  }

  return {
    valid: true,
    slots: matchingSlots.map((s) => ({
      id: s.id,
      period: s.period,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      weekType: s.weekType,
      groupId: s.groupId || null,
      groupName: s.group?.name,
    })),
  };
}
