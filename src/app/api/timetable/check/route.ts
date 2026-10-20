import { NextRequest, NextResponse } from "next/server";
import { validateEventAgainstTimetable } from "@/lib/timetable";
import { findDayOff } from "@/lib/dayoff";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const subjectId = searchParams.get("subjectId");
    const groupId = searchParams.get("groupId");

    if (!date) {
      return NextResponse.json(
        { valid: false, message: "Chybí parametr data", slots: [] },
        { status: 400 }
      );
    }

    const result = await validateEventAgainstTimetable(date, subjectId, groupId);
    // Je-li v ten den zadané volno, přibalíme upozornění (web i AI jím varují u testů)
    const dayOff = await findDayOff(date, groupId);
    return NextResponse.json({ ...result, dayOff });
  } catch (error: any) {
    console.error("Timetable check error:", error);
    return NextResponse.json(
      { valid: false, message: "Chyba při ověřování rozvrhu", slots: [] },
      { status: 500 }
    );
  }
}
