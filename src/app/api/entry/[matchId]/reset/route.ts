import {
  buildEntryResponse,
  getOrCreateMatchEntry,
  loadEntryMatch,
  resetTeamEntrySlots,
  resolvePlayoffRoundLabelForMatch,
  toEntryContext,
} from "@/lib/entry-api";
import { canSaveOrConfirm, isPublished } from "@/lib/entry";
import {
  assertEntryEditPermission,
  requireAuthContext,
} from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const authResult = await requireAuthContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: { teamId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const teamId = body.teamId;
  const viewerRole = authResult.player?.role ?? null;

  if (!teamId) {
    return NextResponse.json({ error: "teamId가 필요합니다." }, { status: 400 });
  }

  const match = await loadEntryMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }

  const entry = match.entry ?? (await getOrCreateMatchEntry(matchId));
  const ctx = toEntryContext(entry, match);

  if (isPublished(ctx)) {
    return NextResponse.json({ error: "공개된 엔트리는 초기화할 수 없습니다." }, { status: 403 });
  }

  const permissionError = assertEntryEditPermission(authResult, match, teamId);
  if (permissionError) {
    return permissionError;
  }

  if (!authResult.isAdmin && !canSaveOrConfirm(ctx, teamId, viewerRole)) {
    return NextResponse.json({ error: "초기화 권한이 없습니다." }, { status: 403 });
  }

  try {
    await resetTeamEntrySlots({ entryId: entry.id, teamId, match });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TEAM") {
      return NextResponse.json({ error: "유효하지 않은 팀입니다." }, { status: 400 });
    }
    throw error;
  }

  const refreshed = await loadEntryMatch(matchId);
  if (!refreshed?.entry) {
    return NextResponse.json({ error: "엔트리를 불러오지 못했습니다." }, { status: 500 });
  }

  const playoffRoundLabel = await resolvePlayoffRoundLabelForMatch(refreshed);

  return NextResponse.json(
    buildEntryResponse({
      entry: refreshed.entry,
      match: refreshed,
      slots: refreshed.entry.slots,
      viewerTeamId: authResult.isAdmin ? teamId : authResult.player?.teamId ?? teamId,
      viewerRole,
      isAdmin: authResult.isAdmin,
      playoffRoundLabel,
    }),
  );
}
