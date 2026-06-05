import type { ActingRole } from "@/lib/entry";
import {
  canEditEntry,
  canSaveOrConfirm,
  canViewTeamSlots,
  getEntryStatus,
  isLeadershipRole,
  isPublished,
  resolvePublishedAt,
  getSixManEntrySetIds,
  teamHasSixManBonus,
  teamHasSixManEntryFromSlots,
  type EntryWithTeams,
} from "@/lib/entry";
import { prisma } from "@/lib/prisma";
import type { Player } from "@prisma/client";

const entryMatchInclude = {
  homeTeam: {
    include: {
      players: {
        where: { isActive: true },
        orderBy: [{ tier: "asc" as const }, { nickname: "asc" as const }],
      },
    },
  },
  awayTeam: {
    include: {
      players: {
        where: { isActive: true },
        orderBy: [{ tier: "asc" as const }, { nickname: "asc" as const }],
      },
    },
  },
  sets: { orderBy: { orderIndex: "asc" as const } },
  entry: {
    include: {
      slots: {
        include: { player: true },
      },
    },
  },
};

export async function loadEntryMatch(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: entryMatchInclude,
  });
}

export async function getOrCreateMatchEntry(matchId: string) {
  const existing = await prisma.matchEntry.findUnique({ where: { matchId } });
  if (existing) {
    return existing;
  }

  return prisma.matchEntry.create({ data: { matchId } });
}

export function parseActingRole(value: string | null): ActingRole {
  if (value === "CAPTAIN" || value === "VICE_CAPTAIN" || value === "MEMBER") {
    return value;
  }
  return null;
}

export function toEntryContext(
  entry: {
    homeConfirmedAt: Date | null;
    awayConfirmedAt: Date | null;
    publishedAt: Date | null;
  },
  match: { homeTeamId: string; awayTeamId: string },
): EntryWithTeams {
  return {
    homeConfirmedAt: entry.homeConfirmedAt,
    awayConfirmedAt: entry.awayConfirmedAt,
    publishedAt: entry.publishedAt,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  };
}

export function buildEntryResponse({
  entry,
  match,
  slots,
  viewerTeamId,
  viewerRole,
  isStaff = false,
}: {
  entry: {
    id: string;
    matchId: string;
    homeConfirmedAt: Date | null;
    awayConfirmedAt: Date | null;
    publishedAt: Date | null;
    homeConfirmedBy: string | null;
    awayConfirmedBy: string | null;
  };
  match: {
    id: string;
    week: number;
    round: number;
    scheduledAt: Date | null;
    homeTeamId: string;
    awayTeamId: string;
    homeTeam: {
      id: string;
      name: string;
      color: string;
      players: Pick<Player, "id" | "nickname" | "tier" | "race">[];
    };
    awayTeam: {
      id: string;
      name: string;
      color: string;
      players: Pick<Player, "id" | "nickname" | "tier" | "race">[];
    };
    sets: { id: string; orderIndex: number; tierBracket: string; mapName: string | null }[];
  };
  slots: {
    teamId: string;
    setId: string;
    playerId: string;
    player: Pick<Player, "id" | "nickname" | "tier" | "race">;
  }[];
  viewerTeamId: string | null;
  viewerRole: ActingRole;
  isStaff?: boolean;
}) {
  const ctx = toEntryContext(entry, match);
  const published = isPublished(ctx);
  const canViewHome =
    isStaff || canViewTeamSlots(ctx, viewerTeamId, viewerRole, match.homeTeamId);
  const canViewAway =
    isStaff || canViewTeamSlots(ctx, viewerTeamId, viewerRole, match.awayTeamId);

  const homeSlots = canViewHome
    ? slots
        .filter((slot) => slot.teamId === match.homeTeamId)
        .map(({ setId, playerId, player }) => ({ setId, playerId, player }))
    : null;

  const awaySlots = canViewAway
    ? slots
        .filter((slot) => slot.teamId === match.awayTeamId)
        .map(({ setId, playerId, player }) => ({ setId, playerId, player }))
    : null;

  return {
    entry: {
      id: entry.id,
      matchId: entry.matchId,
      homeConfirmedAt: entry.homeConfirmedAt,
      awayConfirmedAt: entry.awayConfirmedAt,
      publishedAt: entry.publishedAt,
      homeConfirmedBy: entry.homeConfirmedBy,
      awayConfirmedBy: entry.awayConfirmedBy,
      status: getEntryStatus(ctx),
    },
    match: {
      id: match.id,
      week: match.week,
      round: match.round,
      scheduledAt: match.scheduledAt,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      sets: match.sets,
    },
    slots: {
      home: homeSlots,
      away: awaySlots,
      homeHidden: !canViewHome,
      awayHidden: !canViewAway,
    },
    permissions: {
      isStaff,
      canEditHome: isStaff
        ? canEditEntry(ctx, match.homeTeamId)
        : viewerTeamId === match.homeTeamId &&
          canSaveOrConfirm(ctx, match.homeTeamId, viewerRole),
      canEditAway: isStaff
        ? canEditEntry(ctx, match.awayTeamId)
        : viewerTeamId === match.awayTeamId &&
          canSaveOrConfirm(ctx, match.awayTeamId, viewerRole),
      canSave: isStaff
        ? !published
        : !!viewerTeamId && canSaveOrConfirm(ctx, viewerTeamId, viewerRole),
      canConfirm: isStaff
        ? !published
        : !!viewerTeamId && canSaveOrConfirm(ctx, viewerTeamId, viewerRole),
      viewOnly: published && (!isStaff && (!viewerTeamId || viewerRole === "MEMBER" || viewerRole === null)),
      needsSelection:
        !published && !isStaff && (!viewerTeamId || !isLeadershipRole(viewerRole)),
      isPublic: published,
    },
  };
}

export async function assertTeamPlayers(
  teamId: string,
  slots: { setId: string; playerId: string }[],
) {
  if (slots.length === 0) {
    return;
  }

  const playerIds = [...new Set(slots.map((slot) => slot.playerId))];
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds }, teamId, isActive: true },
  });

  if (players.length !== playerIds.length) {
    throw new Error("INVALID_PLAYERS");
  }
}

export async function upsertEntrySlots(
  entryId: string,
  teamId: string,
  slots: { setId: string; playerId: string }[],
) {
  for (const slot of slots) {
    await prisma.entrySlot.upsert({
      where: {
        entryId_teamId_setId: {
          entryId,
          teamId,
          setId: slot.setId,
        },
      },
      create: {
        entryId,
        teamId,
        setId: slot.setId,
        playerId: slot.playerId,
      },
      update: {
        playerId: slot.playerId,
      },
    });
  }
}

export function getConfirmedByForTeam(
  teamId: string,
  match: { homeTeamId: string; awayTeamId: string },
  confirmedBy: string,
) {
  if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    throw new Error("INVALID_TEAM");
  }
  return confirmedBy.trim();
}

export async function confirmEntryTeam({
  entryId,
  teamId,
  match,
  confirmedBy,
}: {
  entryId: string;
  teamId: string;
  match: { id: string; homeTeamId: string; awayTeamId: string };
  confirmedBy: string;
}) {
  const entry = await prisma.matchEntry.findUniqueOrThrow({ where: { id: entryId } });
  const now = new Date();
  const isHome = teamId === match.homeTeamId;
  const isAway = teamId === match.awayTeamId;

  if (!isHome && !isAway) {
    throw new Error("INVALID_TEAM");
  }

  const homeConfirmedAt = isHome ? now : entry.homeConfirmedAt;
  const awayConfirmedAt = isAway ? now : entry.awayConfirmedAt;
  const publishedAt = resolvePublishedAt(
    { homeConfirmedAt, awayConfirmedAt, publishedAt: entry.publishedAt },
    now,
  );

  const updatedEntry = await prisma.matchEntry.update({
    where: { id: entryId },
    data: {
      homeConfirmedAt: isHome ? now : undefined,
      awayConfirmedAt: isAway ? now : undefined,
      homeConfirmedBy: isHome ? confirmedBy : undefined,
      awayConfirmedBy: isAway ? confirmedBy : undefined,
      publishedAt,
    },
  });

  if (isPublished(toEntryContext(updatedEntry, match))) {
    await syncMatchSixManEntry(match.id);
  }

  return updatedEntry;
}

export async function syncMatchSixManEntry(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      sets: { orderBy: { orderIndex: "asc" } },
      entry: { include: { slots: true } },
    },
  });

  if (!match?.entry || !isPublished(toEntryContext(match.entry, match))) {
    return;
  }

  const sixManSetIds = getSixManEntrySetIds(match.sets);
  const slots = match.entry.slots;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      sixManEntryHome: teamHasSixManEntryFromSlots(match.homeTeamId, sixManSetIds, slots),
      sixManEntryAway: teamHasSixManEntryFromSlots(match.awayTeamId, sixManSetIds, slots),
    },
  });
}

export async function syncMatchSixManFromResults(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      sets: { orderBy: { orderIndex: "asc" }, include: { result: true } },
      entry: { include: { slots: true } },
    },
  });

  if (!match) {
    return;
  }

  const entrySlots =
    match.entry && isPublished(toEntryContext(match.entry, match)) ? match.entry.slots : undefined;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      sixManEntryHome: teamHasSixManBonus(match, match.homeTeamId, entrySlots),
      sixManEntryAway: teamHasSixManBonus(match, match.awayTeamId, entrySlots),
    },
  });
}
