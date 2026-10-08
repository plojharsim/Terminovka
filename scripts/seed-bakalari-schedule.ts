import { PrismaClient } from "@prisma/client";
import { PERIOD_TIMES } from "../src/lib/timetable";

const prisma = new PrismaClient();

async function main() {
  console.log("Importing Bakaláři schedule for 1.B SSPŠ...");

  // 1. Groups
  const groupAll = await prisma.studentGroup.upsert({
    where: { code: "ALL" },
    update: { name: "Celá třída" },
    create: {
      name: "Celá třída",
      code: "ALL",
      isDefaultAll: true,
    },
  });

  const groupSK2 = await prisma.studentGroup.upsert({
    where: { code: "SK2" },
    update: { name: "1.B SK2" },
    create: {
      name: "1.B SK2",
      code: "SK2",
      isDefaultAll: false,
    },
  });

  const groupB21A = await prisma.studentGroup.upsert({
    where: { code: "B21A" },
    update: { name: "1.B B21A" },
    create: {
      name: "1.B B21A",
      code: "B21A",
      isDefaultAll: false,
    },
  });

  const group3ITK = await prisma.studentGroup.upsert({
    where: { code: "3ITK" },
    update: { name: "1.B 3ITK" },
    create: {
      name: "1.B 3ITK",
      code: "3ITK",
      isDefaultAll: false,
    },
  });

  // Remove test subject if present
  await prisma.subject.deleteMany({
    where: { code: "TT" },
  });

  // 2. Subjects from Bakaláři image
  const subjectsData = [
    { code: "HAR", name: "Hardware", defaultRoom: "S202", teacher: "Šim", color: "#D97706" },
    { code: "PSI", name: "Počítačové sítě", defaultRoom: "S106", teacher: "Koš", color: "#2563EB" },
    { code: "TEK", name: "Technická komunikace", defaultRoom: "S404", teacher: "Egy", color: "#0D9488" },
    { code: "CJL", name: "Český jazyk a literatura", defaultRoom: "S216", teacher: "Krt", color: "#E11D48" },
    { code: "PDV", name: "Praktická dílenská výuka", defaultRoom: "S402", teacher: "Hej", color: "#EA580C" },
    { code: "M", name: "Matematika", defaultRoom: "S113", teacher: "Maš", color: "#4F46E5" },
    { code: "FYZ", name: "Fyzika", defaultRoom: "S208", teacher: "Mia", color: "#0284C7" },
    { code: "ELE", name: "Elektrotechnika", defaultRoom: "S108", teacher: "Cim", color: "#7C3AED" },
    { code: "PCV", name: "Programování a cvičení", defaultRoom: "S315", teacher: "Pol", color: "#059669" },
    { code: "BIO", name: "Biologie a ekologie", defaultRoom: "S216", teacher: "Čech", color: "#16A34A" },
    { code: "DEJ", name: "Dějepis", defaultRoom: "S318", teacher: "Kuč", color: "#B45309" },
    { code: "PVA", name: "Programování a vývoj aplikací", defaultRoom: "S315", teacher: "Lup", color: "#0891B2" },
    { code: "ANG", name: "Anglický jazyk", defaultRoom: "R405", teacher: "Čer", color: "#C026D3" },
    { code: "ONA", name: "Občanská nauka", defaultRoom: "R202", teacher: "Kaj", color: "#64748B" },
    { code: "CHE", name: "Chemie", defaultRoom: "R231", teacher: "Hyp", color: "#DB2777" },
    { code: "TEV", name: "Tělesná výchova", defaultRoom: "T2", teacher: "Pej", color: "#65A30D" },
  ];

  const subjectMap = new Map<string, string>();

  for (const s of subjectsData) {
    const record = await prisma.subject.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        defaultRoom: s.defaultRoom,
        teacher: s.teacher,
        color: s.color,
      },
      create: s,
    });
    subjectMap.set(s.code, record.id);
  }

  // 3. Delete existing schedule slots before seeding authentic timetable
  await prisma.scheduleSlot.deleteMany({});

  // 4. Timetable slots definition
  const rawSlots: Array<{
    day: number;
    period: number;
    code: string;
    room?: string;
    weekType?: "ALL" | "EVEN" | "ODD" | "SELF_STUDY";
    groupId?: string;
  }> = [
    // PONDĚLÍ (day 1)
    { day: 1, period: 1, code: "HAR", room: "S202", weekType: "ALL" },
    { day: 1, period: 2, code: "HAR", room: "S202", weekType: "ALL" },
    { day: 1, period: 3, code: "PSI", room: "S106", weekType: "EVEN" }, // S
    { day: 1, period: 3, code: "TEK", room: "S404", weekType: "ODD" },  // L
    { day: 1, period: 4, code: "PSI", room: "S106", weekType: "EVEN" }, // S
    { day: 1, period: 4, code: "TEK", room: "S404", weekType: "ODD" },  // L
    { day: 1, period: 5, code: "CJL", room: "S216", weekType: "ALL" },

    // ÚTERÝ (day 2)
    { day: 2, period: 1, code: "PDV", room: "S402", weekType: "ALL" },
    { day: 2, period: 2, code: "PDV", room: "S402", weekType: "ALL" },
    { day: 2, period: 3, code: "M", room: "S113", weekType: "ALL" },
    { day: 2, period: 4, code: "M", room: "S113", weekType: "ALL" },
    { day: 2, period: 5, code: "CJL", room: "S208", weekType: "ALL" },
    { day: 2, period: 6, code: "FYZ", room: "S208", weekType: "ALL" },

    // STŘEDA (day 3)
    { day: 3, period: 1, code: "M", room: "S314", weekType: "ALL" },
    { day: 3, period: 2, code: "ELE", room: "S108", weekType: "ALL" },
    { day: 3, period: 3, code: "ELE", room: "S108", weekType: "ALL" },
    { day: 3, period: 4, code: "PCV", room: "S315", weekType: "ALL" },
    { day: 3, period: 5, code: "PCV", room: "S315", weekType: "ALL" },
    { day: 3, period: 6, code: "BIO", room: "S216", weekType: "ALL" },
    { day: 3, period: 7, code: "DEJ", room: "S318", weekType: "ALL" },
    { day: 3, period: 9, code: "PVA", room: "S315", weekType: "ALL" },
    { day: 3, period: 10, code: "PVA", room: "S315", weekType: "ALL" },

    // ČTVRTEK (day 4)
    { day: 4, period: 1, code: "ANG", room: "R405", weekType: "ALL" },
    { day: 4, period: 2, code: "ANG", room: "R405", weekType: "ALL" },
    { day: 4, period: 3, code: "FYZ", room: "R304", weekType: "ALL" },
    { day: 4, period: 4, code: "DEJ", room: "R304", weekType: "ALL" },
    { day: 4, period: 5, code: "ONA", room: "R202", weekType: "ALL" },
    { day: 4, period: 6, code: "CHE", room: "R231", weekType: "ALL" },
    { day: 4, period: 8, code: "TEV", room: "T2", weekType: "ALL", groupId: groupSK2.id },
    { day: 4, period: 9, code: "TEV", room: "T2", weekType: "ALL", groupId: groupSK2.id },

    // PÁTEK (day 5 - Samostudium 'S' v Bakalářích)
    { day: 5, period: 1, code: "CHE", room: "R231", weekType: "SELF_STUDY" },
    { day: 5, period: 2, code: "PSI", room: "S106", weekType: "SELF_STUDY" },
    { day: 5, period: 3, code: "ANG", room: "R405", weekType: "SELF_STUDY", groupId: groupB21A.id },
    { day: 5, period: 4, code: "M", room: "S113", weekType: "SELF_STUDY", groupId: group3ITK.id },
    { day: 5, period: 5, code: "TEK", room: "S404", weekType: "SELF_STUDY" },
    { day: 5, period: 6, code: "CJL", room: "S216", weekType: "SELF_STUDY" },
  ];

  for (const item of rawSlots) {
    const subjectId = subjectMap.get(item.code);
    if (!subjectId) {
      console.warn("Subject not found for code:", item.code);
      continue;
    }
    const times = PERIOD_TIMES[item.period] || { startTime: "08:00", endTime: "08:45" };

    await prisma.scheduleSlot.create({
      data: {
        dayOfWeek: item.day,
        period: item.period,
        startTime: times.startTime,
        endTime: times.endTime,
        subjectId: subjectId,
        room: item.room || null,
        weekType: item.weekType || "ALL",
        groupId: item.groupId || null,
      },
    });
  }

  console.log(`Successfully imported ${rawSlots.length} schedule slots for 1.B SSPŠ!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
