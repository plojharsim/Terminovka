const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function exportData() {
  console.log("📦 Zahajuji export dat ze SQLite...");

  try {
    const users = await prisma.user.findMany();
    const subjects = await prisma.subject.findMany();
    const groups = await prisma.studentGroup.findMany();
    const slots = await prisma.scheduleSlot.findMany();
    const events = await prisma.event.findMany();
    const configs = await prisma.appConfig.findMany();

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        subjects: subjects.length,
        groups: groups.length,
        slots: slots.length,
        events: events.length,
        configs: configs.length,
      },
      data: {
        users,
        subjects,
        groups,
        slots,
        events,
        configs,
      },
    };

    const outputPath = path.join(process.cwd(), "terminovka_backup.json");
    fs.writeFileSync(outputPath, JSON.stringify(backup, null, 2), "utf-8");

    console.log("✅ Export úspěšně dokončen!");
    console.log(`Soubor uložen do: ${outputPath}`);
    console.log("Statistika exportu:");
    console.log(` - Uživatelé: ${users.length}`);
    console.log(` - Předměty: ${subjects.length}`);
    console.log(` - Skupiny: ${groups.length}`);
    console.log(` - Rozvrh hodin (sloty): ${slots.length}`);
    console.log(` - Události (testy, úkoly): ${events.length}`);
    console.log(` - Konfigurace: ${configs.length}`);
  } catch (error) {
    console.error("❌ Chyba při exportu:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
