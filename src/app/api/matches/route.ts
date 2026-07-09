import {
  buildMatchAdminPayload,
  createMatch,
  getActiveSeasonForMatchAdmin,
  listSeasonMatches,
  matchToAdminInput,
} from "@/lib/match-admin-api";
import type { MatchAdminInput } from "@/lib/match-admin";
import { requireScheduleContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireScheduleContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const season = await getActiveSeasonForMatchAdmin();
  if (!season) {
    return NextResponse.json({ error: "활성 시즌이 없습니다." }, { status: 404 });
  }

  const matches = await listSeasonMatches(season.id);

  return NextResponse.json({
    ...buildMatchAdminPayload(season),
    matches: matches.map((match) => ({
      id: match.id,
      week: match.week,
      round: match.round,
      scheduledAt: match.scheduledAt,
      status: match.status,
      countsTowardStandings: match.countsTowardStandings,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      setCount: match.sets.length,
      hasResults: match.sets.some((set) => set.result),
    })),
  });
}

export async function POST(request: Request) {
  const authResult = await requireScheduleContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const season = await getActiveSeasonForMatchAdmin();
  if (!season) {
    return NextResponse.json({ error: "활성 시즌이 없습니다." }, { status: 404 });
  }

  let body: MatchAdminInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const match = await createMatch(season.id, body);
    if (!match) {
      return NextResponse.json({ error: "경기 생성에 실패했습니다." }, { status: 500 });
    }
    return NextResponse.json({
      matchId: match.id,
      match: matchToAdminInput(match),
      meta: {
        hasResults: match.sets.some((set) => set.result),
        hasEntry: !!match.entry,
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INVALID_TEAMS") {
        return NextResponse.json({ error: "유효하지 않은 팀입니다." }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
