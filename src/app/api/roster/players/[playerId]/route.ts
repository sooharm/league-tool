import {
  getActiveSeasonRoster,
  parseAndUpdatePlayer,
  removePlayer,
} from "@/lib/roster-api";
import { assertPlayerRosterPermission, requireRosterContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ playerId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { playerId } = await context.params;

  const permissionError = await assertPlayerRosterPermission(authResult, playerId);
  if (permissionError) {
    return permissionError;
  }

  const body = await request.json();

  const result = await parseAndUpdatePlayer(playerId, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const roster = await getActiveSeasonRoster();
  return NextResponse.json({ player: result.player, roster });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireRosterContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { playerId } = await context.params;

  const permissionError = await assertPlayerRosterPermission(authResult, playerId);
  if (permissionError) {
    return permissionError;
  }

  const result = await removePlayer(playerId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const roster = await getActiveSeasonRoster();
  return NextResponse.json({ ...result, roster });
}
