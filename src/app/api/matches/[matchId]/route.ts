import {
  deleteMatch,
  getMatchAdminDetail,
  matchToAdminInput,
  updateMatch,
} from "@/lib/match-admin-api";
import type { MatchAdminInput } from "@/lib/match-admin";
import { requireStaffContext } from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireStaffContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { matchId } = await context.params;
  const match = await getMatchAdminDetail(matchId);

  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    match: matchToAdminInput(match),
    meta: {
      hasResults: match.sets.some((set) => set.result),
      hasEntry: !!match.entry,
    },
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const authResult = await requireStaffContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { matchId } = await context.params;

  let body: MatchAdminInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  try {
    const match = await updateMatch(matchId, body);
    if (!match) {
      return NextResponse.json({ error: "경기 수정에 실패했습니다." }, { status: 500 });
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
      if (error.message === "MATCH_NOT_FOUND") {
        return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
      }
      if (error.message === "INVALID_TEAMS") {
        return NextResponse.json({ error: "유효하지 않은 팀입니다." }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireStaffContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { matchId } = await context.params;

  try {
    await deleteMatch(matchId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "MATCH_NOT_FOUND") {
      return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
    }
    throw error;
  }
}
