import { prisma } from "./prisma";

// Volno (typ události DAYOFF) platí pro celou třídu, nebo jen pro zvolenou skupinu.
export async function findDayOff(dateStr: string, groupId?: string | null) {
  const events = await prisma.event.findMany({
    where: { type: "DAYOFF", date: new Date(`${dateStr}T00:00:00.000Z`) },
    include: { group: true },
  });
  const match = events.find(
    (e) => !e.groupId || e.group?.isDefaultAll || !groupId || groupId === "ALL" || e.groupId === groupId
  );
  return match ? { id: match.id, title: match.title } : null;
}

// Pracovní dny (Po–Pá) od-do včetně, jako YYYY-MM-DD. Maximálně 200 dní, ať nevznikne obří série.
export function weekdaysBetween(startStr: string, endStr: string): string[] {
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = endStr.split("-").map(Number);
  const cur = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  const out: string[] = [];
  let guard = 0;
  while (cur <= end && guard++ < 200) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}
