import { getActiveSeason, getSeasonMatches } from "@/lib/data";
import { calculatePlayerSetHistory } from "@/lib/player-stats";
import type { MatchWithResults } from "@/lib/standings";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ playerId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { playerId } = await context.params;
  const season = await getActiveSeason();

  if (!season) {
    return NextResponse.json({ error: "활성 시즌이 없습니다." }, { status: 404 });
  }

  const player = await prisma.player.findFirst({
    where: { id: playerId, team: { seasonId: season.id }, isActive: true },
    select: { id: true, nickname: true },
  });

  if (!player) {
    return NextResponse.json({ error: "선수를 찾을 수 없습니다." }, { status: 404 });
  }

  const [players, matches] = await Promise.all([
    prisma.player.findMany({
      where: { team: { seasonId: season.id }, isActive: true },
      select: { id: true, nickname: true },
    }),
    getSeasonMatches(season.id),
  ]);

  const history = calculatePlayerSetHistory(
    playerId,
    players,
    matches as MatchWithResults[],
  );

  return NextResponse.json({
    playerId: player.id,
    nickname: player.nickname,
    history,
  });
}
