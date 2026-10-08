#!/bin/sh
set -e

# If the persistent DB in volume doesn't exist, initialize it from seed template
if [ ! -f /app/data/prod.db ]; then
  echo "Initializing persistent database from template..."
  cp /app/prisma/dev.db /app/data/prod.db
fi

# Synchronize the admin password hash on container start
# This guarantees that updating the seed/hash in code immediately updates the DB even with an existing persistent volume
node -e '
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  try {
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
    console.log("Admin account synced with latest credentials.");
  } catch (err) {
    console.error("Error syncing admin account:", err);
  } finally {
    await prisma.$disconnect();
  }
})();
'

exec node server.js
