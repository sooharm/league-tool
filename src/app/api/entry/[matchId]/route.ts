import {
  assertTeamPlayers,
  buildEntryResponse,
  getOrCreateMatchEntry,
  loadEntryMatch,
  toEntryContext,
  upsertEntrySlots,
} from "@/lib/entry-api";
import { canSaveOrConfirm, isPublished } from "@/lib/entry";
import { prisma } from "@/lib/prisma";
import {
  assertEntryEditPermission,
  getAuthContext,
  requireAuthContext,
  resolveEntryViewer,
} from "@/lib/permissions";
import { NextResponse } from "next/server";

type RouteContext = { params: Promise<{ matchId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const auth = await getAuthContext();
  const { viewerTeamId, viewerRole } = resolveEntryViewer(auth);

  const match = await loadEntryMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }

  const entry = match.entry ?? (await getOrCreateMatchEntry(matchId));
  const slots =
    match.entry?.slots ??
    (await prisma.entrySlot.findMany({
      where: { entryId: entry.id },
      include: { player: true },
    }));

  return NextResponse.json(
    buildEntryResponse({
      entry,
      match,
      slots,
      viewerTeamId,
      viewerRole,
      isStaff: auth?.isStaff ?? false,
    }),
  );
}

export async function PUT(request: Request, context: RouteContext) {
  const { matchId } = await context.params;
  const authResult = await requireAuthContext();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  let body: {
    teamId?: string;
    slots?: { setId: string; playerId: string }[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const teamId = body.teamId;
  const slots = body.slots;
  const viewerRole = authResult.player?.role ?? null;

  if (!teamId || !Array.isArray(slots)) {
    return NextResponse.json({ error: "teamId와 slots가 필요합니다." }, { status: 400 });
  }

  const match = await loadEntryMatch(matchId);
  if (!match) {
    return NextResponse.json({ error: "경기를 찾을 수 없습니다." }, { status: 404 });
  }

  const entry = match.entry ?? (await getOrCreateMatchEntry(matchId));
  const ctx = toEntryContext(entry, match);

  if (isPublished(ctx)) {
    return NextResponse.json({ error: "공개된 엔트리는 수정할 수 없습니다." }, { status: 403 });
  }

  const permissionError = assertEntryEditPermission(authResult, match, teamId);
  if (permissionError) {
    return permissionError;
  }

  if (!authResult.isStaff && !canSaveOrConfirm(ctx, teamId, viewerRole)) {
    return NextResponse.json({ error: "저장 권한이 없습니다." }, { status: 403 });
  }

  const matchSetIds = new Set(match.sets.map((set) => set.id));
  if (slots.some((slot) => !matchSetIds.has(slot.setId))) {
    return NextResponse.json({ error: "유효하지 않은 세트입니다." }, { status: 400 });
  }

  try {
    await assertTeamPlayers(teamId, slots);
    await upsertEntrySlots(entry.id, teamId, slots);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PLAYERS") {
      return NextResponse.json({ error: "유효하지 않은 선수입니다." }, { status: 400 });
    }
    throw error;
  }

  const updated = await loadEntryMatch(matchId);
  if (!updated?.entry) {
    return NextResponse.json({ error: "엔트리를 불러오지 못했습니다." }, { status: 500 });
  }

  return NextResponse.json(
    buildEntryResponse({
      entry: updated.entry,
      match: updated,
      slots: updated.entry.slots,
      viewerTeamId: teamId,
      viewerRole,
      isStaff: authResult.isStaff,
    }),
  );
}
