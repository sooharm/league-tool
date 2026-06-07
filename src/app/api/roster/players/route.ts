import { parseAndCreatePlayer } from "@/lib/roster-api";
import { assertRosterTeamPermission, requireRosterContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const teamId =
    body && typeof body === "object" && typeof (body as { teamId?: unknown }).teamId === "string"
      ? (body as { teamId: string }).teamId
      : null;

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
