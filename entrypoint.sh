#!/bin/sh
set -e

# If the persistent DB in volume doesn't exist, initialize it from seed template
if [ ! -f /app/data/prod.db ]; then
  echo "Initializing persistent database from template..."
  cp /app/prisma/dev.db /app/data/prod.db
else
  # Create automated timestamped backup on every container start
  mkdir -p /app/data/backups
  cp /app/data/prod.db "/app/data/backups/prod-$(date +%Y%m%d-%H%M%S).db" 2>/dev/null || true
  # Keep only the last 10 backups
  ls -tp /app/data/backups/*.db 2>/dev/null | tail -n +11 | xargs -I {} rm -- {} 2>/dev/null || true
fi

# Run automatic migrations and synchronization on container start
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
    // 1. Safe schema migration for new columns
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE Event ADD COLUMN weight INTEGER;");
      console.log("✅ Migration: Added weight column to Event table.");
    } catch (e) {
      // Column already exists, safe to continue
    }
    try {
      await prisma.$executeRawUnsafe("ALTER TABLE Event ADD COLUMN recurringId TEXT;");
      console.log("✅ Migration: Added recurringId column to Event table.");
    } catch (e) {
      // Column already exists, safe to continue
    }

    const eventCount = await prisma.event.count();
    console.log(`📊 Databáze obsahuje celkem ${eventCount} událostí.`);

    const adminHash = "$2b$10$aCl0FAKCgBF.6Sj07l1WEeLVKUVo5LWeaLriyQf9whCNbQr5E0V32";
    await prisma.user.upsert({
      where: { email: "plojharsim@gmail.com" },
      update: { passwordHash: adminHash, role: "ADMIN", isActive: true },
      create: {
        email: "plojharsim@gmail.com",
        name: "Šimon Plojhar",
        passwordHash: adminHash,
        role: "ADMIN",
        isActive: true
      }
    });
    // Synchronize official Bakalari subject names and teachers
    const officialSubjects = [
      { code: "ANG", name: "Anglický jazyk", teacher: "Mgr. Veronika Černovická" },
      { code: "BIO", name: "Biologie", teacher: "Mgr. Blanka Čechová" },
      { code: "CHE", name: "Chemie", teacher: "Vojtěch Hypša" },
      { code: "DEJ", name: "Dějepis", teacher: "Martin Kučera" },
      { code: "ELE", name: "Elektrotechnika", teacher: "Ing. Zuzana Cimlerová" },
      { code: "FYZ", name: "Fyzika", teacher: "Adam Mikoška" },
      { code: "HAR", name: "Hardware", teacher: "Adrian Simonides" },
      { code: "M", name: "Matematika", teacher: "Ivana Mašková" },
      { code: "ONA", name: "Občanská nauka", teacher: "Bc. Joel Karásek" },
      { code: "PSI", name: "Počítačové sítě", teacher: "Štěpán Koliáš" },
      { code: "PCV", name: "Praktická cvičení", teacher: "Martin Polťák" },
      { code: "PDV", name: "Prezentační dovednosti", teacher: "Michal Hejduk" },
      { code: "PVA", name: "Programování a vývoj aplikací", teacher: "Lukáš Procházka" },
      { code: "TEK", name: "Technické kreslení", teacher: "David Egyházi" },
      { code: "TEV", name: "Tělesná výchova", teacher: "Bc. Kristýna Pejšová" },
      { code: "CJL", name: "Český jazyk a literatura", teacher: "Mgr. Tereza Krausová" }
    ];

    for (const sub of officialSubjects) {
      await prisma.subject.updateMany({
        where: { code: sub.code },
        data: { name: sub.name, teacher: sub.teacher }
      });
    }

    console.log("Admin account & official subjects synced with latest data.");
  } catch (err) {
    console.error("Error syncing data:", err);
  } finally {
    await prisma.$disconnect();
  }
})();
'

exec node server.js
