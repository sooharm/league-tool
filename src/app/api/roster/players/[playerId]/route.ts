import {
  getActiveSeasonRoster,
  parseAndUpdatePlayer,
  removePlayer,
} from "@/lib/roster-api";
import { requireStaffContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ playerId: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const authResult = await requireStaffContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { playerId } = await context.params;
  const body = await request.json();

  const result = await parseAndUpdatePlayer(playerId, body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const roster = await getActiveSeasonRoster();
  return NextResponse.json({ player: result.player, roster });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireStaffContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { playerId } = await context.params;

  const result = await removePlayer(playerId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const roster = await getActiveSeasonRoster();
  return NextResponse.json({ ...result, roster });
}
