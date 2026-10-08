import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding production database...");

  // 1. Administrator Account
  const adminPasswordHash = await bcrypt.hash("heslo", 10);

  const admin = await prisma.user.upsert({
    where: { email: "plojharsim@gmail.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      email: "plojharsim@gmail.com",
      name: "Šimon Plojhar",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log("Admin account ready:", admin.email);

  // 2. Default Root Group
  const groupAll = await prisma.studentGroup.upsert({
    where: { code: "ALL" },
    update: {},
    create: {
      name: "Celá třída",
      code: "ALL",
      isDefaultAll: true,
    },
  });

  console.log("Root group ready:", groupAll.name);
  console.log("Database initialized cleanly for production!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
