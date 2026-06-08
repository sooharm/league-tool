import type { PlayerRole } from "@prisma/client";

export type EntryStatus = "draft" | "partial" | "published";

export type ViewerRole = "ADMIN" | null;

export type ActingRole = PlayerRole | null;
export type EntryLike = {
  homeConfirmedAt: Date | null;
  awayConfirmedAt: Date | null;
  publishedAt: Date | null;
};

export type EntryWithTeams = EntryLike & {
  homeTeamId: string;
  awayTeamId: string;
};

export function getEntryStatus(entry: EntryLike): EntryStatus {
  if (entry.homeConfirmedAt && entry.awayConfirmedAt) {
    return "published";
  }
  if (entry.homeConfirmedAt || entry.awayConfirmedAt) {
    return "partial";
  }
  return "draft";
}

export function isPublished(entry: EntryLike): boolean {
  return getEntryStatus(entry) === "published";
}

export function canViewEntry(
  entry: EntryWithTeams,
  viewerTeamId: string | null,
  viewerRole: ViewerRole,
): boolean {
  if (isPublished(entry)) {
    return true;
  }

  if (viewerRole === "ADMIN") {
    return true;
  }

  if (!viewerTeamId) {
    return false;
  }

  return viewerTeamId === entry.homeTeamId || viewerTeamId === entry.awayTeamId;
}

export function canEditEntry(entry: EntryWithTeams, teamId: string): boolean {
  if (isPublished(entry)) {
    return false;
  }

  // 양팀 모두 확정(전체 공개) 전까지 해당 팀 엔트리 수정 가능 (한쪽만 확정해도 수정 가능)
  return teamId === entry.homeTeamId || teamId === entry.awayTeamId;
}

export function isLeadershipRole(
  role: ActingRole,
): role is Extract<PlayerRole, "CAPTAIN" | "VICE_CAPTAIN"> {
  return role === "CAPTAIN" || role === "VICE_CAPTAIN";
}

export function getEntryBadgeLabel(entry: EntryLike): string {
  if (isPublished(entry)) {
    return "공개됨";
  }
  if (entry.homeConfirmedAt && !entry.awayConfirmedAt) {
    return "홈팀 확정";
  }
  if (entry.awayConfirmedAt && !entry.homeConfirmedAt) {
    return "어웨이팀 확정";
  }
  return "작성 중";
}

export function canViewTeamSlots(
  entry: EntryWithTeams,
  viewerTeamId: string | null,
  viewerRole: ActingRole,
  targetTeamId: string,
): boolean {
  if (isPublished(entry)) {
    return true;
  }

  if (!viewerTeamId || !isLeadershipRole(viewerRole)) {
    return false;
  }

  return viewerTeamId === targetTeamId;
}

export function canSaveOrConfirm(
  entry: EntryWithTeams,
  teamId: string,
  actingRole: ActingRole,
): boolean {
  if (isPublished(entry)) {
    return false;
  }

  if (!isLeadershipRole(actingRole)) {
    return false;
  }

  return canEditEntry(entry, teamId);
}

export function resolvePublishedAt(entry: EntryLike, now = new Date()): Date | null {
  if (entry.homeConfirmedAt && entry.awayConfirmedAt) {
    return entry.publishedAt ?? now;
  }
  return null;
}

export function actingRoleLabel(role: PlayerRole) {
  if (role === "CAPTAIN") return "팀장";
  if (role === "VICE_CAPTAIN") return "부팀장";
  return "일반";
}

export type EntrySlotPlayer = {
  teamId: string;
  setId: string;
  playerId: string;
  player: { nickname: string; tier: number; race: string };
};

export function getSetEntryPlayers(
  setId: string,
  homeTeamId: string,
  awayTeamId: string,
  slots: EntrySlotPlayer[],
) {
  const homeSlot = slots.find((slot) => slot.setId === setId && slot.teamId === homeTeamId);
  const awaySlot = slots.find((slot) => slot.setId === setId && slot.teamId === awayTeamId);
  return {
    home: homeSlot ? { id: homeSlot.playerId, ...homeSlot.player } : null,
    away: awaySlot ? { id: awaySlot.playerId, ...awaySlot.player } : null,
  };
}

type SixManSet = {
  id: string;
  orderIndex: number;
  tierBracket: string;
};

type SixManSetResult = {
  winnerTeamId: string;
  loserTeamId: string;
  winnerPlayerId: string;
  loserPlayerId: string | null;
  isForfeit?: boolean;
};

/** 엔트리·6인 가산점 대상: 일정 1~6세트(에이스결정전 제외) */
export function getSixManEntrySetIds(sets: SixManSet[]): string[] {
  return [...sets]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((set) => set.tierBracket !== "ACE")
    .map((set) => set.id);
}

export function getEntrySubmissionSets<T extends SixManSet>(sets: T[]): T[] {
  const entrySetIds = new Set(getSixManEntrySetIds(sets));
  return [...sets]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .filter((set) => entrySetIds.has(set.id));
}

export function teamHasSixManEntryFromSlots(
  teamId: string,
  sixManSetIds: string[],
  slots: { teamId: string; setId: string; playerId: string }[],
): boolean {
  if (sixManSetIds.length < 6) {
    return false;
  }

  const teamSlots = slots.filter(
    (slot) => slot.teamId === teamId && sixManSetIds.includes(slot.setId),
  );

  if (teamSlots.length !== 6) {
    return false;
  }

  return new Set(teamSlots.map((slot) => slot.playerId)).size === 6;
}

export function getPublishedEntryPlayerIds(
  teamId: string,
  sixManSetIds: string[],
  slots: { teamId: string; setId: string; playerId: string }[],
): Set<string> {
  return new Set(
    slots
      .filter((slot) => slot.teamId === teamId && sixManSetIds.includes(slot.setId))
      .map((slot) => slot.playerId),
  );
}

export function teamHasSixManEntryFromResults(
  teamId: string,
  sixManSetIds: string[],
  sets: { id: string; result: SixManSetResult | null }[],
  publishedEntryPlayerIds?: Set<string>,
): boolean | null {
  if (sixManSetIds.length < 6) {
    return false;
  }

  const validPlayerIds = new Set<string>();

  for (const setId of sixManSetIds) {
    const set = sets.find((item) => item.id === setId);
    if (!set?.result) {
      return null;
    }

    if (set.result.isForfeit) {
      if (set.result.loserTeamId === teamId) {
        continue;
      }

      if (publishedEntryPlayerIds && !publishedEntryPlayerIds.has(set.result.winnerPlayerId)) {
        continue;
      }

      validPlayerIds.add(set.result.winnerPlayerId);
      continue;
    }

    const playerId =
      set.result.winnerTeamId === teamId
        ? set.result.winnerPlayerId
        : set.result.loserTeamId === teamId
          ? set.result.loserPlayerId
          : null;

    if (!playerId) {
      return false;
    }

    if (publishedEntryPlayerIds && !publishedEntryPlayerIds.has(playerId)) {
      continue;
    }

    validPlayerIds.add(playerId);
  }

  return validPlayerIds.size === 6;
}

export function resolvePublishedEntrySlotsForMatch(match: {
  entry?: {
    homeConfirmedAt: Date | null;
    awayConfirmedAt: Date | null;
    publishedAt: Date | null;
    slots: { teamId: string; setId: string; playerId: string }[];
  } | null;
}) {
  if (!match.entry?.slots.length || !isPublished(match.entry)) {
    return undefined;
  }

  return match.entry.slots;
}

export function teamHasSixManBonus(
  match: {
    homeTeamId: string;
    awayTeamId: string;
    sixManEntryHome: boolean;
    sixManEntryAway: boolean;
    sets: (SixManSet & { result: SixManSetResult | null })[];
  },
  teamId: string,
  entrySlots?: { teamId: string; setId: string; playerId: string }[],
): boolean {
  const sixManSetIds = getSixManEntrySetIds(match.sets);
  if (sixManSetIds.length < 6) {
    return false;
  }

  const publishedEntryPlayerIds = entrySlots
    ? getPublishedEntryPlayerIds(teamId, sixManSetIds, entrySlots)
    : undefined;

  const fromResults = teamHasSixManEntryFromResults(
    teamId,
    sixManSetIds,
    match.sets,
    publishedEntryPlayerIds,
  );
  if (fromResults !== null) {
    return fromResults;
  }

  if (entrySlots) {
    return teamHasSixManEntryFromSlots(teamId, sixManSetIds, entrySlots);
  }

  return teamId === match.homeTeamId ? match.sixManEntryHome : match.sixManEntryAway;
}

/** @deprecated syncMatchSixManEntry에서 teamHasSixManEntryFromSlots 사용 */
export function teamHasSixManEntry(
  teamId: string,
  setIds: string[],
  slots: { teamId: string; setId: string; playerId: string }[],
): boolean {
  return teamHasSixManEntryFromSlots(teamId, setIds, slots);
}