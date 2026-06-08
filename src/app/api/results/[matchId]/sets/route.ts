import { addMatchSet, loadMatchForResults, removeAceSet } from "@/lib/results-api";
import {
  assertResultsEditPermission,
  requireAuthContext,
} from "@/lib/permissions";
import type { TierBracket } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ matchId: string }> };

const VALID_BRACKETS = new Set<TierBracket>([
  "TIER_1_2",
  "TIER_2_3",
  "TIER_3_4",
  "TIER_4_5",
  "TIER_2",
  "TIER_3",
  "TIER_4",
  "ACE",
]);

export async function POST(request: Request, context: RouteContext) {
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

  let body: { tierBracket?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const tierBracket = (body.tierBracket ?? "ACE") as TierBracket;
  if (!VALID_BRACKETS.has(tierBracket)) {
    return NextResponse.json({ error: "유효하지 않은 티어입니다." }, { status: 400 });
  }

  try {
    const response = await addMatchSet(matchId, tierBracket);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MATCH_NOT_FOUND") {
        return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
      }
      if (error.message === "ACE_SET_EXISTS") {
        return NextResponse.json(
          { error: "에이스결정전 세트가 이미 있습니다." },
          { status: 400 },
        );
      }
    }
    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
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

  let body: { setId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "setId가 필요합니다." }, { status: 400 });
  }

  const setId = body.setId?.trim();
  if (!setId) {
    return NextResponse.json({ error: "setId가 필요합니다." }, { status: 400 });
  }

  try {
    const response = await removeAceSet(matchId, setId);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MATCH_NOT_FOUND") {
        return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
      }
      if (error.message === "SET_NOT_FOUND") {
        return NextResponse.json({ error: "세트를 찾을 수 없습니다." }, { status: 404 });
      }
      if (error.message === "NOT_ACE_SET") {
        return NextResponse.json(
          { error: "에이스결정전 세트만 삭제할 수 있습니다." },
          { status: 400 },
        );
      }
    }
    throw error;
  }
}
