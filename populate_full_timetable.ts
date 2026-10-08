import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting full timetable and groups population...");

  // 1. Definovány všechny předměty z rozvrhu
  const subjectsData = [
    { code: "HAR", name: "Hardware", color: "#D97706", defaultRoom: "S202", teacher: "Sim / Lud" },
    { code: "PSI", name: "Počítačové sítě", color: "#2563EB", defaultRoom: "S106", teacher: "Koš" },
    { code: "TEK", name: "Technická komunikace", color: "#0D9488", defaultRoom: "S404", teacher: "Egy" },
    { code: "CJL", name: "Český jazyk a literatura", color: "#E11D48", defaultRoom: "S216", teacher: "Krt" },
    { code: "NEM", name: "Německý jazyk", color: "#F59E0B", defaultRoom: "S108", teacher: "Mab" },
    { code: "FR",  name: "Francouzský jazyk", color: "#6366F1", defaultRoom: "S306", teacher: "Pom" },
    { code: "PDV", name: "Praktická dílenská výuka", color: "#EA580C", defaultRoom: "S402", teacher: "Hej / Fij" },
    { code: "M",   name: "Matematika", color: "#4F46E5", defaultRoom: "S113", teacher: "Maš / Mai / Agh / Miš / Fre" },
    { code: "FYZ", name: "Fyzika", color: "#0284C7", defaultRoom: "S208", teacher: "Mia" },
    { code: "ELE", name: "Elektrotechnika", color: "#7C3AED", defaultRoom: "S108", teacher: "Cim" },
    { code: "PCV", name: "Programování a cvičení", color: "#059669", defaultRoom: "S315", teacher: "Kub / Pol / Hni" },
    { code: "BIO", name: "Biologie a ekologie", color: "#16A34A", defaultRoom: "S216", teacher: "Čech" },
    { code: "DEJ", name: "Dějepis", color: "#B45309", defaultRoom: "S318", teacher: "Kuč" },
    { code: "PVA", name: "Programování a vývoj aplikací", color: "#0891B2", defaultRoom: "S315", teacher: "Lup / Hej" },
    { code: "ANG", name: "Anglický jazyk", color: "#C026D3", defaultRoom: "R405", teacher: "Xx / Nov / Čer / Han / Prv / Par / Kra / Pos" },
    { code: "ONA", name: "Občanská nauka", color: "#64748B", defaultRoom: "R202", teacher: "Kaj" },
    { code: "CHE", name: "Chemie", color: "#DB2777", defaultRoom: "R231", teacher: "Hyp" },
    { code: "TEV", name: "Tělesná výchova", color: "#65A30D", defaultRoom: "T1", teacher: "Pej / Urb" },
  ];

  const subjectMap = new Map<string, string>();
  for (const s of subjectsData) {
    const res = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, color: s.color, defaultRoom: s.defaultRoom, teacher: s.teacher },
      create: s,
    });
    subjectMap.set(s.code, res.id);
  }
  console.log("Upserted subjects:", subjectMap.size);

  // 2. Definovány všechny skupiny podle oficiálního rozvrhu 1.B
  const groupsData = [
    { code: "ALL", name: "Celá třída", isDefaultAll: true },
    // Dělení na poloviny (SK1, SK2)
    { code: "SK1", name: "1.B Skupina 1 (SK1)", isDefaultAll: false },
    { code: "SK2", name: "1.B Skupina 2 (SK2)", isDefaultAll: false },
    // Matematické skupiny
    { code: "1ITK", name: "1ITK (Matematika)", isDefaultAll: false },
    { code: "2ITK", name: "2ITK (Matematika)", isDefaultAll: false },
    { code: "3ITK", name: "3ITK (Matematika)", isDefaultAll: false },
    { code: "4ITK", name: "4ITK (Matematika)", isDefaultAll: false },
    { code: "5ITK", name: "5ITK (Matematika)", isDefaultAll: false },
    // Jazyky 2 (Němčina, Francouzština)
    { code: "NEM", name: "Německý jazyk (NEM)", isDefaultAll: false },
    { code: "FRJ1", name: "Francouzský jazyk (FRJ1)", isDefaultAll: false },
    // Počítačová cvičení / Programování skupiny (PCV, PVA)
    { code: "PCV1", name: "PCV Skupina 1 (Kub)", isDefaultAll: false },
    { code: "PCV2", name: "PCV Skupina 2 (Pol)", isDefaultAll: false },
    { code: "PCV3", name: "PCV3 Sdíl (Hni)", isDefaultAll: false },
    { code: "PVA1", name: "PVA Skupina 1 (Lup)", isDefaultAll: false },
    { code: "PVA2", name: "PVA Skupina 2 (Hej)", isDefaultAll: false },
    // Angličtina skupiny
    { code: "ANG_Xx",  name: "ANG (uč. Xx)",  isDefaultAll: false },
    { code: "ANG_Nov", name: "ANG (uč. Nov)", isDefaultAll: false },
    { code: "ANG_Cer", name: "ANG (uč. Čer)", isDefaultAll: false },
    { code: "ANG_Han", name: "ANG (uč. Han)", isDefaultAll: false },
    { code: "ANG_Prv", name: "ANG (uč. Prv)", isDefaultAll: false },
    { code: "ANG_Par", name: "ANG (uč. Par)", isDefaultAll: false },
    { code: "ANG_Kra", name: "ANG (uč. Kra)", isDefaultAll: false },
    { code: "ANG_Pos", name: "ANG (uč. Pos)", isDefaultAll: false },
  ];

  const groupMap = new Map<string, string>();
  for (const g of groupsData) {
    const res = await prisma.studentGroup.upsert({
      where: { code: g.code },
      update: { name: g.name, isDefaultAll: g.isDefaultAll },
      create: g,
    });
    groupMap.set(g.code, res.id);
  }
  console.log("Upserted groups:", groupMap.size);

  // Smazat staré scheduleSloty a nahrát kompletní přesný rozvrh
  await prisma.scheduleSlot.deleteMany();
  console.log("Cleared old schedule slots.");

  const PERIOD_TIMES: Record<number, { startTime: string; endTime: string }> = {
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

  interface SlotDef {
    day: number;
    period: number;
    subject: string;
    group?: string;
    weekType?: "ALL" | "EVEN" | "ODD" | "SELF_STUDY";
    room?: string;
  }

  const scheduleSlots: SlotDef[] = [
    // ================= PONDĚLÍ (Po = 1) =================
    // 1. hodina: SK2 HAR S202 (Sim), SK1 HAR S102 (Lud)
    { day: 1, period: 1, subject: "HAR", group: "SK2", room: "S202", weekType: "ALL" },
    { day: 1, period: 1, subject: "HAR", group: "SK1", room: "S102", weekType: "ALL" },
    // 2. hodina: SK2 HAR S202 (Sim), SK1 HAR S102 (Lud)
    { day: 1, period: 2, subject: "HAR", group: "SK2", room: "S202", weekType: "ALL" },
    { day: 1, period: 2, subject: "HAR", group: "SK1", room: "S102", weekType: "ALL" },
    // 3. hodina:
    // Sudý (S): SK2 PSI S106 (Koš), SK1 TEK S404 (Egy)
    // Lichý (L): SK2 TEK S404 (Egy), SK1 PSI S106 (Koš)
    { day: 1, period: 3, subject: "PSI", group: "SK2", room: "S106", weekType: "EVEN" },
    { day: 1, period: 3, subject: "TEK", group: "SK1", room: "S404", weekType: "EVEN" },
    { day: 1, period: 3, subject: "TEK", group: "SK2", room: "S404", weekType: "ODD" },
    { day: 1, period: 3, subject: "PSI", group: "SK1", room: "S106", weekType: "ODD" },
    // 4. hodina:
    // Sudý (S): SK2 PSI S106 (Koš), SK1 TEK S404 (Egy)
    // Lichý (L): SK2 TEK S404 (Egy), SK1 PSI S106 (Koš)
    { day: 1, period: 4, subject: "PSI", group: "SK2", room: "S106", weekType: "EVEN" },
    { day: 1, period: 4, subject: "TEK", group: "SK1", room: "S404", weekType: "EVEN" },
    { day: 1, period: 4, subject: "TEK", group: "SK2", room: "S404", weekType: "ODD" },
    { day: 1, period: 4, subject: "PSI", group: "SK1", room: "S106", weekType: "ODD" },
    // 5. hodina: CJL S216 (Krt) - celá třída
    { day: 1, period: 5, subject: "CJL", room: "S216", weekType: "ALL" },
    // 6. hodina: NEM S108 (Mab), FRJ1 S306 (Pom)
    { day: 1, period: 6, subject: "NEM", group: "NEM", room: "S108", weekType: "ALL" },
    { day: 1, period: 6, subject: "FR",  group: "FRJ1", room: "S306", weekType: "ALL" },
    // 7. hodina: NEM S108 (Mab), FRJ1 S306 (Pom)
    { day: 1, period: 7, subject: "NEM", group: "NEM", room: "S108", weekType: "ALL" },
    { day: 1, period: 7, subject: "FR",  group: "FRJ1", room: "S306", weekType: "ALL" },

    // ================= ÚTERÝ (Út = 2) =================
    // 1. hodina: SK2 PDV S402 (Hej), SK1 PDV S313 (Fij)
    { day: 2, period: 1, subject: "PDV", group: "SK2", room: "S402", weekType: "ALL" },
    { day: 2, period: 1, subject: "PDV", group: "SK1", room: "S313", weekType: "ALL" },
    // 2. hodina: SK2 PDV S402 (Hej), SK1 PDV S313 (Fij)
    { day: 2, period: 2, subject: "PDV", group: "SK2", room: "S402", weekType: "ALL" },
    { day: 2, period: 2, subject: "PDV", group: "SK1", room: "S313", weekType: "ALL" },
    // 3. hodina: M (skupiny 1ITK - 5ITK)
    { day: 2, period: 3, subject: "M", group: "1ITK", room: "S206", weekType: "ALL" },
    { day: 2, period: 3, subject: "M", group: "2ITK", room: "S201", weekType: "ALL" },
    { day: 2, period: 3, subject: "M", group: "3ITK", room: "S113", weekType: "ALL" },
    { day: 2, period: 3, subject: "M", group: "4ITK", room: "S314", weekType: "ALL" },
    { day: 2, period: 3, subject: "M", group: "5ITK", room: "S111", weekType: "ALL" },
    // 4. hodina: M (skupiny 1ITK - 5ITK)
    { day: 2, period: 4, subject: "M", group: "1ITK", room: "S206", weekType: "ALL" },
    { day: 2, period: 4, subject: "M", group: "2ITK", room: "S201", weekType: "ALL" },
    { day: 2, period: 4, subject: "M", group: "3ITK", room: "S113", weekType: "ALL" },
    { day: 2, period: 4, subject: "M", group: "4ITK", room: "S314", weekType: "ALL" },
    { day: 2, period: 4, subject: "M", group: "5ITK", room: "S111", weekType: "ALL" },
    // 5. hodina: CJL S208 (Krt) - celá třída
    { day: 2, period: 5, subject: "CJL", room: "S208", weekType: "ALL" },
    // 6. hodina: FYZ S208 (Mia) - celá třída
    { day: 2, period: 6, subject: "FYZ", room: "S208", weekType: "ALL" },

    // ================= STŘEDA (St = 3) =================
    // 1. hodina: M (skupiny 1ITK - 5ITK)
    { day: 3, period: 1, subject: "M", group: "1ITK", room: "S206", weekType: "ALL" },
    { day: 3, period: 1, subject: "M", group: "2ITK", room: "S201", weekType: "ALL" },
    { day: 3, period: 1, subject: "M", group: "3ITK", room: "S314", weekType: "ALL" },
    { day: 3, period: 1, subject: "M", group: "4ITK", room: "S111", weekType: "ALL" },
    { day: 3, period: 1, subject: "M", group: "5ITK", room: "S113", weekType: "ALL" },
    // 2. hodina: ELE S108 (Cim) - celá třída
    { day: 3, period: 2, subject: "ELE", room: "S108", weekType: "ALL" },
    // 3. hodina: ELE S108 (Cim) - celá třída
    { day: 3, period: 3, subject: "ELE", room: "S108", weekType: "ALL" },
    // 4. hodina: PCV (skupiny PCV1 Kub S109, PCV2 Pol S315, PCV3 Hni Sdíl)
    { day: 3, period: 4, subject: "PCV", group: "PCV1", room: "S109", weekType: "ALL" },
    { day: 3, period: 4, subject: "PCV", group: "PCV2", room: "S315", weekType: "ALL" },
    { day: 3, period: 4, subject: "PCV", group: "PCV3", room: "Sdíl", weekType: "ALL" },
    // 5. hodina: PCV (skupiny PCV1 Kub S109, PCV2 Pol S315, PCV3 Hni Sdíl)
    { day: 3, period: 5, subject: "PCV", group: "PCV1", room: "S109", weekType: "ALL" },
    { day: 3, period: 5, subject: "PCV", group: "PCV2", room: "S315", weekType: "ALL" },
    { day: 3, period: 5, subject: "PCV", group: "PCV3", room: "Sdíl", weekType: "ALL" },
    // 6. hodina: BIO S216 (Čech) - celá třída
    { day: 3, period: 6, subject: "BIO", room: "S216", weekType: "ALL" },
    // 7. hodina: DEJ S318 (Kuč) - celá třída
    { day: 3, period: 7, subject: "DEJ", room: "S318", weekType: "ALL" },
    // 9. hodina: PVA (PVA1 Lup S315, PVA2 Hej S402)
    { day: 3, period: 9, subject: "PVA", group: "PVA1", room: "S315", weekType: "ALL" },
    { day: 3, period: 9, subject: "PVA", group: "PVA2", room: "S402", weekType: "ALL" },
    // 10. hodina: PVA (PVA1 Lup S315, PVA2 Hej S402)
    { day: 3, period: 10, subject: "PVA", group: "PVA1", room: "S315", weekType: "ALL" },
    { day: 3, period: 10, subject: "PVA", group: "PVA2", room: "S402", weekType: "ALL" },

    // ================= ČTVRTEK (Čt = 4) =================
    // 1. hodina: ANG (8 skupin v různých učebnách)
    { day: 4, period: 1, subject: "ANG", group: "ANG_Xx",  room: "R06č", weekType: "ALL" },
    { day: 4, period: 1, subject: "ANG", group: "ANG_Nov", room: "R201", weekType: "ALL" },
    { day: 4, period: 1, subject: "ANG", group: "ANG_Cer", room: "R405", weekType: "ALL" },
    { day: 4, period: 1, subject: "ANG", group: "ANG_Han", room: "R204", weekType: "ALL" },
    { day: 4, period: 1, subject: "ANG", group: "ANG_Prv", room: "R231", weekType: "ALL" },
    { day: 4, period: 1, subject: "ANG", group: "ANG_Par", room: "R327", weekType: "ALL" },
    { day: 4, period: 1, subject: "ANG", group: "ANG_Kra", room: "R03č", weekType: "ALL" },
    { day: 4, period: 1, subject: "ANG", group: "ANG_Pos", room: "R13Č", weekType: "ALL" },
    // 2. hodina: ANG (8 skupin v různých učebnách)
    { day: 4, period: 2, subject: "ANG", group: "ANG_Xx",  room: "R06č", weekType: "ALL" },
    { day: 4, period: 2, subject: "ANG", group: "ANG_Nov", room: "R201", weekType: "ALL" },
    { day: 4, period: 2, subject: "ANG", group: "ANG_Cer", room: "R405", weekType: "ALL" },
    { day: 4, period: 2, subject: "ANG", group: "ANG_Han", room: "R204", weekType: "ALL" },
    { day: 4, period: 2, subject: "ANG", group: "ANG_Prv", room: "R231", weekType: "ALL" },
    { day: 4, period: 2, subject: "ANG", group: "ANG_Par", room: "R327", weekType: "ALL" },
    { day: 4, period: 2, subject: "ANG", group: "ANG_Kra", room: "R03č", weekType: "ALL" },
    { day: 4, period: 2, subject: "ANG", group: "ANG_Pos", room: "R01Č", weekType: "ALL" },
    // 3. hodina: FYZ R304 (Mia) - celá třída
    { day: 4, period: 3, subject: "FYZ", room: "R304", weekType: "ALL" },
    // 4. hodina: DEJ R304 (Kuč) - celá třída
    { day: 4, period: 4, subject: "DEJ", room: "R304", weekType: "ALL" },
    // 5. hodina: ONA R202 (Kaj) - celá třída
    { day: 4, period: 5, subject: "ONA", room: "R202", weekType: "ALL" },
    // 6. hodina: CHE R231 (Hyp) - celá třída
    { day: 4, period: 6, subject: "CHE", room: "R231", weekType: "ALL" },
    // 8. hodina: TEV (SK2 Pej T2, SK1 Urb T1)
    { day: 4, period: 8, subject: "TEV", group: "SK2", room: "T2", weekType: "ALL" },
    { day: 4, period: 8, subject: "TEV", group: "SK1", room: "T1", weekType: "ALL" },
    // 9. hodina: TEV (SK2 Pej T2, SK1 Urb T1)
    { day: 4, period: 9, subject: "TEV", group: "SK2", room: "T2", weekType: "ALL" },
    { day: 4, period: 9, subject: "TEV", group: "SK1", room: "T1", weekType: "ALL" },

    // ================= PÁTEK (Pá = 5) SAMOSTUDIUM =================
    // 1. hodina: CHE (Hyp) - SamS
    { day: 5, period: 1, subject: "CHE", room: "SamS", weekType: "SELF_STUDY" },
    // 2. hodina: PSI (Koš) - SamS
    { day: 5, period: 2, subject: "PSI", room: "SamS", weekType: "SELF_STUDY" },
    // 3. hodina: ANG (SamS pro všech 8 skupin)
    { day: 5, period: 3, subject: "ANG", group: "ANG_Xx",  room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 3, subject: "ANG", group: "ANG_Nov", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 3, subject: "ANG", group: "ANG_Cer", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 3, subject: "ANG", group: "ANG_Han", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 3, subject: "ANG", group: "ANG_Prv", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 3, subject: "ANG", group: "ANG_Par", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 3, subject: "ANG", group: "ANG_Kra", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 3, subject: "ANG", group: "ANG_Pos", room: "SamS", weekType: "SELF_STUDY" },
    // 4. hodina: M (SamS pro 5 skupin M)
    { day: 5, period: 4, subject: "M", group: "1ITK", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 4, subject: "M", group: "2ITK", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 4, subject: "M", group: "3ITK", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 4, subject: "M", group: "4ITK", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 4, subject: "M", group: "5ITK", room: "SamS", weekType: "SELF_STUDY" },
    // 5. hodina: TEK (Egy) - SamS
    { day: 5, period: 5, subject: "TEK", room: "SamS", weekType: "SELF_STUDY" },
    // 6. hodina: CJL (Krt) - SamS
    { day: 5, period: 6, subject: "CJL", room: "SamS", weekType: "SELF_STUDY" },
    // 7. hodina: NEM (Mab) & FR (Pom) - SamS
    { day: 5, period: 7, subject: "NEM", group: "NEM", room: "SamS", weekType: "SELF_STUDY" },
    { day: 5, period: 7, subject: "FR",  group: "FRJ1", room: "SamS", weekType: "SELF_STUDY" },
  ];

  console.log(`Inserting ${scheduleSlots.length} schedule slots...`);

  for (const slot of scheduleSlots) {
    const sId = subjectMap.get(slot.subject);
    if (!sId) {
      console.warn(`Subject ${slot.subject} not found!`);
      continue;
    }
    const gId = slot.group ? groupMap.get(slot.group) || null : null;
    const times = PERIOD_TIMES[slot.period] || { startTime: "08:00", endTime: "08:45" };

    await prisma.scheduleSlot.create({
      data: {
        dayOfWeek: slot.day,
        period: slot.period,
        subjectId: sId,
        groupId: gId,
        room: slot.room || null,
        weekType: slot.weekType || "ALL",
        startTime: times.startTime,
        endTime: times.endTime,
      },
    });
  }

  console.log("All schedule slots inserted successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
