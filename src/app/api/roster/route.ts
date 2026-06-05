import { getActiveSeasonRoster } from "@/lib/roster-api";
import { requireStaffContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireStaffContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const roster = await getActiveSeasonRoster();
  if (!roster) {
    return NextResponse.json({ error: "활성 시즌이 없습니다." }, { status: 404 });
  }
  return NextResponse.json(roster);
}
