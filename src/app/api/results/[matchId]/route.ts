import {
  buildResultsResponse,
  loadMatchForResults,
  validateAndSaveResults,
} from "@/lib/results-api";
import type { SetResultInput } from "@/lib/results";
import {
  assertResultsEditPermission,
  requireAuthContext,
} from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const match = await loadMatchForResults(matchId);

  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }

  if (match.sets.length === 0) {
    return NextResponse.json({ error: "세트가 등록되지 않은 경기입니다." }, { status: 400 });
  }

  return NextResponse.json(buildResultsResponse(match));
}

export async function PUT(request: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const authResult = await requireAuthContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const match = await loadMatchForResults(matchId);
  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }

  const permissionError = assertResultsEditPermission(authResult, match);
  if (permissionError) {
    return permissionError;
  }

  let body: {
    results?: SetResultInput[];
    playedAt?: string;
    bjName?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!Array.isArray(body.results)) {
    return NextResponse.json({ error: "results 배열이 필요합니다." }, { status: 400 });
  }

  if (body.results.length === 0 && body.bjName === undefined) {
    return NextResponse.json({ error: "저장할 결과 또는 BJ명이 필요합니다." }, { status: 400 });
  }

  try {
    const response = await validateAndSaveResults(
      matchId,
      body.results,
      body.playedAt,
      body.bjName,
    );
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MATCH_NOT_FOUND") {
        return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
      }
      if (error.message === "INVALID_SET") {
        return NextResponse.json({ error: "유효하지 않은 세트입니다." }, { status: 400 });
      }
      if (error.message === "INVALID_PLAYERS") {
        return NextResponse.json({ error: "유효하지 않은 선수입니다." }, { status: 400 });
      }
      if (error.message === "SAME_PLAYER") {
        return NextResponse.json({ error: "승자와 패자는 달라야 합니다." }, { status: 400 });
      }
      if (error.message === "BOTH_FORFEIT") {
        return NextResponse.json({ error: "양팀 모두 기권으로 처리할 수 없습니다." }, { status: 400 });
      }
      if (error.message === "FORFEIT_WINNER_MISMATCH") {
        return NextResponse.json({ error: "기권 처리 시 승자는 기권하지 않은 팀이어야 합니다." }, { status: 400 });
      }
    }
    throw error;
  }
}
