const { execSync } = require("child_process");

const dbUrl = process.env.DATABASE_URL || "";
if (dbUrl && !dbUrl.includes("localhost:5432") && !dbUrl.startsWith("file:")) {
  try {
    console.log("🔄 Synchronizuji schéma databáze na Vercelu (prisma db push)...");
    execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
    console.log("🌱 Kontrola prvotních dat...");
    require("./auto-init.js");
  } catch (e) {
    console.warn("⚠️ Varování při auto-build synchronizaci databáze:", e.message);
  }
} else {
  console.log("ℹ️ Lokální nebo testovací build bez produkční databáze.");
}
