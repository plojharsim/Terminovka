const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

async function autoInit() {
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl || dbUrl.includes("localhost:5432") || dbUrl.startsWith("file:")) {
    console.log("ℹ️ Auto-init: Lokální nebo prázdná databáze, přeskakuji auto-init při buildu.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      console.log(`ℹ️ Auto-init: Databáze již obsahuje ${userCount} uživatelů, import se přeskakuje.`);
      return;
    }

    console.log("🌱 Auto-init: Databáze je prázdná, zahajuji automatický import zálohy...");
    const inputPath = path.join(process.cwd(), "terminovka_backup.json");
    if (!fs.existsSync(inputPath)) {
      console.log("⚠️ terminovka_backup.json nenalezen, přeskakuji.");
      return;
    }

    const data = JSON.parse(fs.readFileSync(inputPath, "utf-8"));

    // 1. Users
    for (const u of data.users || []) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: u.passwordHash,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : undefined,
        },
      });
    }

    // 2. Subjects
    for (const s of data.subjects || []) {
      await prisma.subject.upsert({
        where: { id: s.id },
        update: {},
        create: {
          id: s.id,
          name: s.name,
          code: s.code,
          color: s.color,
          defaultRoom: s.defaultRoom,
          teacher: s.teacher,
          createdAt: s.createdAt ? new Date(s.createdAt) : undefined,
          updatedAt: s.updatedAt ? new Date(s.updatedAt) : undefined,
        },
      });
    }

    // 3. Groups
    for (const g of data.groups || []) {
      await prisma.studentGroup.upsert({
        where: { id: g.id },
        update: {},
        create: {
          id: g.id,
          name: g.name,
          code: g.code,
          isDefaultAll: g.isDefaultAll,
          createdAt: g.createdAt ? new Date(g.createdAt) : undefined,
          updatedAt: g.updatedAt ? new Date(g.updatedAt) : undefined,
        },
      });
    }

    // 4. Slots
    for (const sl of data.slots || []) {
      await prisma.scheduleSlot.upsert({
        where: { id: sl.id },
        update: {},
        create: {
          id: sl.id,
          dayOfWeek: sl.dayOfWeek,
          period: sl.period,
          startTime: sl.startTime,
          endTime: sl.endTime,
          room: sl.room,
          weekType: sl.weekType,
          subjectId: sl.subjectId,
          groupId: sl.groupId,
        },
      });
    }

    // 5. Events
    for (const ev of data.events || []) {
      await prisma.event.upsert({
        where: { id: ev.id },
        update: {},
        create: {
          id: ev.id,
          title: ev.title,
          type: ev.type,
          date: new Date(ev.date),
          hasSpecificTime: ev.hasSpecificTime,
          startTime: ev.startTime,
          endTime: ev.endTime,
          period: ev.period,
          weight: ev.weight,
          recurringId: ev.recurringId,
          description: ev.description,
          attachmentUrl: ev.attachmentUrl,
          attachmentName: ev.attachmentName,
          subjectId: ev.subjectId,
          groupId: ev.groupId,
          createdById: ev.createdById,
          createdAt: ev.createdAt ? new Date(ev.createdAt) : undefined,
          updatedAt: ev.updatedAt ? new Date(ev.updatedAt) : undefined,
        },
      });
    }

    console.log("🎉 Auto-init: Úspěšně naimportována všechna data z terminovka_backup.json!");
  } catch (err) {
    console.warn("⚠️ Auto-init varování:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

autoInit();
