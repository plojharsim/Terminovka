import { NextRequest, NextResponse } from "next/server";
import { getUploadsDir } from "@/lib/storage";
import fs from "fs";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    const decodedName = decodeURIComponent(filename);

    // Prevent path traversal
    if (decodedName.includes("..") || decodedName.includes("/") || decodedName.includes("\\")) {
      return NextResponse.json({ error: "Neplatný název souboru." }, { status: 400 });
    }

    const uploadsDir = getUploadsDir();
    const filePath = path.join(uploadsDir, decodedName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Soubor nebyl nalezen." }, { status: 404 });
    }

    const fileBuffer = await fs.promises.readFile(filePath);
    const ext = path.extname(decodedName).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Detect if browser should view inline or download
    const isViewable = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain; charset=utf-8",
    ].includes(contentType);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${isViewable ? "inline" : "attachment"}; filename="${encodeURIComponent(decodedName)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    console.error("Error serving upload:", error);
    return NextResponse.json({ error: "Chyba při čtení souboru." }, { status: 500 });
  }
}
