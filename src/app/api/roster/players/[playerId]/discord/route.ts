import { linkPlayerDiscord } from "@/lib/roster-api";
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

  let body: { discordUserId?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (body.discordUserId !== null && typeof body.discordUserId !== "string") {
    return NextResponse.json({ error: "discordUserId가 필요합니다." }, { status: 400 });
  }

  const discordUserId =
    body.discordUserId === null ? null : body.discordUserId.trim() || null;

  const result = await linkPlayerDiscord(playerId, discordUserId);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ player: result.player });
}
