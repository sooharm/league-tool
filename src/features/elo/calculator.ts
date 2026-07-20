import { computeRpDeltas, getBaseRp, type RpMatchType } from "@/features/elo/constants";
import {
  applyRpDeltaByNickname,
  createInitialClanRpSnapshot,
  loadClanRpSnapshot,
  persistClanRpSnapshot,
  resolveOfficialTier,
} from "@/features/elo/clan-rp-store";
import { prisma } from "@/lib/prisma";

export { getBaseRp, getBaseElo } from "@/features/elo/constants";
export { computeRpDeltas } from "@/features/elo/constants";

export type RpDeltas = {
  winnerDelta: number;
  loserDelta: number;
};

/** @deprecated use computeRpDeltas */
export function computeEloDeltas(winnerTier: number, loserTier: number): RpDeltas {
  return computeRpDeltas(winnerTier, loserTier, "pro_league");
}

type RpTrackedSetResult = {
  id: string;
  winnerPlayerId: string;
  loserPlayerId: string | null;
  eloWinnerDelta: number | null;
  eloLoserDelta: number | null;
  eloAppliedAt: Date | null;
  winnerPlayer: { nickname: string; tier: number };
  loserPlayer: { nickname: string; tier: number } | null;
};

function isRpEligible(result: { isForfeit: boolean; loserPlayerId: string | null }) {
  return !result.isForfeit && result.loserPlayerId !== null;
}

function computeDeltasForPlayers(
  winner: { nickname: string; tier: number },
  loser: { nickname: string; tier: number },
  snapshot: Awaited<ReturnType<typeof loadClanRpSnapshot>>,
  matchType: RpMatchType,
): RpDeltas | null {
  const winnerTier = resolveOfficialTier(winner.nickname, winner.tier, snapshot);
  const loserTier = resolveOfficialTier(loser.nickname, loser.tier, snapshot);

  if (!snapshot.tierByNickname.has(winner.nickname) && !snapshot.tierByNickname.has(loser.nickname)) {
    return null;
  }

  return computeRpDeltas(winnerTier, loserTier, matchType);
}

export async function revertSetResultElo(result: RpTrackedSetResult) {
  if (!result.eloAppliedAt || !result.loserPlayer) {
    return;
  }

  const winnerDelta = result.eloWinnerDelta ?? 0;
  const loserDelta = result.eloLoserDelta ?? 0;

  await prisma.$transaction([
    prisma.setResult.update({
      where: { id: result.id },
      data: {
        eloWinnerDelta: null,
        eloLoserDelta: null,
        eloAppliedAt: null,
      },
    }),
  ]);

  if (winnerDelta !== 0 || loserDelta !== 0) {
    await applyRpDeltaByNickname(
      result.winnerPlayer.nickname,
      result.loserPlayer.nickname,
      -winnerDelta,
      -loserDelta,
    );
  }
}

export async function revertSetResultEloBySetId(setId: string) {
  const existing = await prisma.setResult.findUnique({
    where: { setId },
    select: {
      id: true,
      winnerPlayerId: true,
      loserPlayerId: true,
      eloWinnerDelta: true,
      eloLoserDelta: true,
      eloAppliedAt: true,
      winnerPlayer: { select: { nickname: true, tier: true } },
      loserPlayer: { select: { nickname: true, tier: true } },
    },
  });

  if (existing) {
    await revertSetResultElo(existing);
  }
}

export async function applySetResultEloBySetId(setId: string) {
  const result = await prisma.setResult.findUnique({
    where: { setId },
    include: {
      winnerPlayer: { select: { id: true, nickname: true, tier: true } },
      loserPlayer: { select: { id: true, nickname: true, tier: true } },
    },
  });

  if (!result || !isRpEligible(result) || result.eloAppliedAt || !result.loserPlayer) {
    return;
  }

  const snapshot = await loadClanRpSnapshot();
  const deltas = computeDeltasForPlayers(
    result.winnerPlayer,
    result.loserPlayer,
    snapshot,
    "pro_league",
  );

  if (!deltas) {
    return;
  }

  const appliedAt = new Date();

  await prisma.$transaction([
    prisma.setResult.update({
      where: { id: result.id },
      data: {
        eloWinnerDelta: deltas.winnerDelta,
        eloLoserDelta: deltas.loserDelta,
        eloAppliedAt: appliedAt,
      },
    }),
  ]);

  await applyRpDeltaByNickname(
    result.winnerPlayer.nickname,
    result.loserPlayer.nickname,
    deltas.winnerDelta,
    deltas.loserDelta,
  );
}

/** 프로리그 세트 결과를 시간순으로 RP에 반영 */
export async function recalculateAllElosFromLeagueResults() {
  const clanMembers = await prisma.clanMember.findMany({
    where: { isActive: true, tier: { gte: 1 } },
    select: { nickname: true, tier: true },
    orderBy: [{ tier: "asc" }, { nickname: "asc" }],
  });

  const snapshot = createInitialClanRpSnapshot(clanMembers);

  await prisma.setResult.updateMany({
    data: {
      eloWinnerDelta: null,
      eloLoserDelta: null,
      eloAppliedAt: null,
    },
  });

  const setResults = await prisma.setResult.findMany({
    where: {
      isForfeit: false,
      loserPlayerId: { not: null },
    },
    orderBy: [{ playedAt: "asc" }, { id: "asc" }],
    include: {
      winnerPlayer: { select: { nickname: true, tier: true } },
      loserPlayer: { select: { nickname: true, tier: true } },
    },
  });

  const appliedAt = new Date();

  for (const result of setResults) {
    if (!result.loserPlayer) {
      continue;
    }

    const deltas = computeDeltasForPlayers(
      result.winnerPlayer,
      result.loserPlayer,
      snapshot,
      "pro_league",
    );

    if (!deltas) {
      continue;
    }

    const winnerRp =
      (snapshot.rpByNickname.get(result.winnerPlayer.nickname) ?? getBaseRp(result.winnerPlayer.tier)) +
      deltas.winnerDelta;
    const loserRp =
      (snapshot.rpByNickname.get(result.loserPlayer.nickname) ?? getBaseRp(result.loserPlayer.tier)) +
      deltas.loserDelta;

    snapshot.rpByNickname.set(result.winnerPlayer.nickname, winnerRp);
    snapshot.rpByNickname.set(result.loserPlayer.nickname, loserRp);

    await prisma.setResult.update({
      where: { id: result.id },
      data: {
        eloWinnerDelta: deltas.winnerDelta,
        eloLoserDelta: deltas.loserDelta,
        eloAppliedAt: appliedAt,
      },
    });
  }

  await persistClanRpSnapshot(snapshot);

  return snapshot.rpByNickname.size;
}
