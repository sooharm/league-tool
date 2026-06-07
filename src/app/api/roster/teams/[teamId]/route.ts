import { assertRosterTeamPermission, requireRosterContext } from "@/lib/permissions";
import { getActiveSeasonRoster, updateTeamName } from "@/lib/roster-api";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ teamId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { teamId } = await context.params;

  const permissionError = assertRosterTeamPermission(authResult, teamId);
  if (permissionError) {
    return permissionError;
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (typeof body.name !== "string") {
    return NextResponse.json({ error: "팀명을 입력해 주세요." }, { status: 400 });
  }

  const result = await updateTeamName(teamId, body.name);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const roster = await getActiveSeasonRoster();
  return NextResponse.json({ team: result.team, roster });
}
