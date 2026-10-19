const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function importData() {
  console.log("🚀 Zahajuji import dat do PostgreSQL...");

  const inputPath = path.join(process.cwd(), "terminovka_backup.json");
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Soubor se zálohou nebyl nalezen: ${inputPath}`);
    console.error("Umístěte prosím soubor 'terminovka_backup.json' do kořenové složky projektu.");
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  const backup = JSON.parse(raw);
  const data = backup.data || backup;

  try {
    // 1. Users
    if (data.users && data.users.length > 0) {
      console.log(`Importuji ${data.users.length} uživatelů...`);
      for (const u of data.users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {
            name: u.name,
            email: u.email,
            passwordHash: u.passwordHash,
            role: u.role,
            isActive: u.isActive,
          },
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
    }

    // 2. Subjects
    if (data.subjects && data.subjects.length > 0) {
      console.log(`Importuji ${data.subjects.length} předmětů...`);
      for (const s of data.subjects) {
        await prisma.subject.upsert({
          where: { id: s.id },
          update: {
            name: s.name,
            code: s.code,
            color: s.color,
            defaultRoom: s.defaultRoom,
            teacher: s.teacher,
          },
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
    }

    // 3. Student Groups
    if (data.groups && data.groups.length > 0) {
      console.log(`Importuji ${data.groups.length} skupin...`);
      for (const g of data.groups) {
        await prisma.studentGroup.upsert({
          where: { id: g.id },
          update: {
            name: g.name,
            code: g.code,
            isDefaultAll: g.isDefaultAll,
          },
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
    }

    // 4. Schedule Slots
    if (data.slots && data.slots.length > 0) {
      console.log(`Importuji ${data.slots.length} hodin rozvrhu...`);
      for (const sl of data.slots) {
        await prisma.scheduleSlot.upsert({
          where: { id: sl.id },
          update: {
            dayOfWeek: sl.dayOfWeek,
            period: sl.period,
            startTime: sl.startTime,
            endTime: sl.endTime,
            room: sl.room,
            weekType: sl.weekType,
            subjectId: sl.subjectId,
            groupId: sl.groupId,
          },
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
    }

    // 5. Events
    if (data.events && data.events.length > 0) {
      console.log(`Importuji ${data.events.length} událostí (testy, úkoly)...`);
      for (const ev of data.events) {
        await prisma.event.upsert({
          where: { id: ev.id },
          update: {
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
          },
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
    }

    // 6. App Config
    if (data.configs && data.configs.length > 0) {
      console.log(`Importuji konfigurace...`);
      for (const c of data.configs) {
        await prisma.appConfig.upsert({
          where: { key: c.key },
          update: { value: c.value },
          create: { key: c.key, value: c.value },
        });
      }
    }

    console.log("🎉 VŠECHNA DATA BYLA ÚSPĚŠNĚ NAIMPORTOVÁNA DO CLOUDOVÉ DATABÁZE!");
  } catch (error) {
    console.error("❌ Chyba při importu:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
