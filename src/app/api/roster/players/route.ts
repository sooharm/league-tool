import { parseAndCreatePlayer } from "@/lib/roster-api";
import { assertRosterTeamPermission, requireRosterContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const body = await request.json();
  const teamId = typeof body?.teamId === "string" ? body.teamId : null;

  if (!teamId) {
    return NextResponse.json({ error: "팀을 선택해주세요." }, { status: 400 });
  }

  const permissionError = assertRosterTeamPermission(authResult, teamId);
  if (permissionError) {
    return permissionError;
  }

  const result = await parseAndCreatePlayer(teamId, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const roster = await import("@/lib/roster-api").then((m) => m.getActiveSeasonRoster());
  return NextResponse.json({ player: result.player, roster });
}
