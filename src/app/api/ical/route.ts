import { NextRequest, NextResponse } from "next/server";
import { generateICalFeed } from "@/lib/ical";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const groupsParam = searchParams.get("groups");
    const typesParam = searchParams.get("types");
    const isDownload = searchParams.get("download") === "1";

    const groupIds = groupsParam !== null
      ? groupsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const types = typesParam
      ? typesParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const icsContent = await generateICalFeed({ groupIds, types });

    const headers: Record<string, string> = {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
    };

    if (isDownload) {
      headers["Content-Disposition"] = 'attachment; filename="skolni_kalendar.ics"';
    } else {
      headers["Content-Disposition"] = 'inline; filename="kalendar.ics"';
    }

    return new NextResponse(icsContent, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Failed to generate iCal:", error);
    return new NextResponse("Internal Server Error generating iCalendar feed", { status: 500 });
  }
}
