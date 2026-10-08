import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUploadsDir } from "@/lib/storage";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Pro nahrání souboru musíte být přihlášeni." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nebyl vybrán žádný soubor." },
        { status: 400 }
      );
    }

    // 50 MB limit
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Maximální povolená velikost souboru je 50 MB." },
        { status: 400 }
      );
    }

    const uploadsDir = getUploadsDir();

    // Sanitize filename and create unique name
    const ext = path.extname(file.name) || "";
    const cleanBase = path
      .basename(file.name, ext)
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, "_")
      .slice(0, 50);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const savedFilename = `${uniqueSuffix}-${cleanBase}${ext}`;
    const destinationPath = path.join(uploadsDir, savedFilename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(destinationPath, buffer);

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${encodeURIComponent(savedFilename)}`,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Chyba při nahrávání souboru." },
      { status: 500 }
    );
  }
}
