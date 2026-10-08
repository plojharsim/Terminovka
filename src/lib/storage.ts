import fs from "fs";
import path from "path";

export function getUploadsDir(): string {
  // In production Docker container, /app/data is the persistent volume
  if (fs.existsSync("/app/data")) {
    const dir = "/app/data/uploads";
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        // ignore
      }
    }
    return dir;
  }

  // Locally in development
  const localDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}
