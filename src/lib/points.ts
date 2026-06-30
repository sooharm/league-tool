import { isDevPredictPreviewEnabled } from "@/lib/dev-predict";
import { getEntrySubmissionSets, getSetEntryPlayers, type EntrySlotPlayer } from "@/lib/entry";
import { isSetPredictionOpen } from "@/lib/prediction";
import { computePredictionPools, computeWinnerPayout } from "@/lib/prediction-odds";
import { prisma } from "@/lib/prisma";

export const WELCOME_POINTS = 100;
export const MIN_PREDICTION_STAKE = 1;
export const MAX_PREDICTION_STAKE = 10;

export async function grantWelcomePoints(discordUserId: string): Promise<void> {
  try {
    await prisma.discordWallet.upsert({
      where: { discordUserId },
      create: { discordUserId, points: WELCOME_POINTS },
      update: {},
    });
  } catch (error) {
    console.error("[points] grantWelcomePoints failed:", discordUserId, error);
  }
}

export async function getWalletPoints(discordUserId: string): Promise<number> {
  try {
    const wallet = await prisma.discordWallet.findUnique({
      where: { discordUserId },
      select: { points: true },
    });

    return wallet?.points ?? 0;
  } catch (error) {
    console.error("[points] getWalletPoints failed:", discordUserId, error);
    return 0;
  }
}

async function ensureWallet(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], discordUserId: string) {
  return tx.discordWallet.upsert({
    where: { discordUserId },
    create: { discordUserId, points: 0 },
    update: {},
  });
}

function previewPlayersForSet(
  homeRoster: { id: string }[],
  awayRoster: { id: string }[],
  setIndex: number,
) {
  if (homeRoster.length === 0 || awayRoster.length === 0) {
    return { home: null, away: null };
  }

  return {
    home: homeRoster[setIndex % homeRoster.length],
    away: awayRoster[setIndex % awayRoster.length],
  };
}

function resolveSetPlayerIds(
  setId: string,
  setIndex: number,
  homeTeamId: string,
  awayTeamId: string,
  slots: EntrySlotPlayer[],
  homeRoster: { id: string }[],
  awayRoster: { id: string }[],
) {
  const fromEntry = getSetEntryPlayers(setId, homeTeamId, awayTeamId, slots);

  if (fromEntry.home && fromEntry.away) {
    return { home: fromEntry.home, away: fromEntry.away };
  }

  if (isDevPredictPreviewEnabled()) {
    const preview = previewPlayersForSet(homeRoster, awayRoster, setIndex);
    if (preview.home && preview.away) {
      return preview;
    }
  }

  return { home: fromEntry.home, away: fromEntry.away };
}

export async function placeSetPredictionBet({
  discordUserId,
  setId,
  pickedPlayerId,
  stake,
}: {
  discordUserId: string;
  setId: string;
  pickedPlayerId: string;
  stake: number;
}) {
  if (!Number.isInteger(stake) || stake < MIN_PREDICTION_STAKE || stake > MAX_PREDICTION_STAKE) {
    throw new Error("INVALID_STAKE");
  }

  const set = await prisma.set.findUnique({
    where: { id: setId },
    include: {
      result: true,
      match: {
        include: {
          homeTeam: {
            include: {
              players: {
                where: { isActive: true },
                orderBy: [{ tier: "asc" }, { nickname: "asc" }],
              },
            },
          },
          awayTeam: {
            include: {
              players: {
                where: { isActive: true },
                orderBy: [{ tier: "asc" }, { nickname: "asc" }],
              },
            },
          },
          entry: {
            include: {
              slots: {
                include: {
                  player: {
                    select: { nickname: true, tier: true, race: true },
                  },
                },
              },
            },
          },
          sets: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!set) {
    throw new Error("SET_NOT_FOUND");
  }

  const { match } = set;
  const slots =
    match.entry?.slots.map((slot) => ({
      teamId: slot.teamId,
      setId: slot.setId,
      playerId: slot.playerId,
      player: slot.player,
    })) ?? [];

  const submissionSets = getEntrySubmissionSets(match.sets);
  const setIndex = submissionSets.findIndex((item) => item.id === set.id);

  if (setIndex < 0) {
    throw new Error("SET_NOT_ELIGIBLE");
  }

  const players = resolveSetPlayerIds(
    set.id,
    setIndex,
    match.homeTeamId,
    match.awayTeamId,
    slots,
    match.homeTeam.players,
    match.awayTeam.players,
  );

  if (!players.home || !players.away) {
    throw new Error("PLAYERS_NOT_READY");
  }

  if (
    pickedPlayerId !== players.home.id &&
    pickedPlayerId !== players.away.id
  ) {
    throw new Error("INVALID_PLAYER");
  }

  if (!isSetPredictionOpen(match, set, slots) && !isDevPredictPreviewEnabled()) {
    throw new Error("PREDICTION_CLOSED");
  }

  if (set.result) {
    throw new Error("PREDICTION_CLOSED");
  }

  return prisma.$transaction(async (tx) => {
    await ensureWallet(tx, discordUserId);

    const existing = await tx.setPrediction.findUnique({
      where: {
        setId_discordUserId: {
          setId,
          discordUserId,
        },
      },
    });

    if (existing && existing.status !== "OPEN") {
      throw new Error("PREDICTION_LOCKED");
    }

    if (existing) {
      await tx.discordWallet.update({
        where: { discordUserId },
        data: { points: { increment: existing.stake } },
      });
    }

    const wallet = await tx.discordWallet.findUniqueOrThrow({
      where: { discordUserId },
      select: { points: true },
    });

    if (wallet.points < stake) {
      throw new Error("INSUFFICIENT_POINTS");
    }

    await tx.discordWallet.update({
      where: { discordUserId },
      data: { points: { decrement: stake } },
    });

    return tx.setPrediction.upsert({
      where: {
        setId_discordUserId: {
          setId,
          discordUserId,
        },
      },
      create: {
        setId,
        discordUserId,
        pickedPlayerId,
        stake,
        status: "OPEN",
      },
      update: {
        pickedPlayerId,
        stake,
        status: "OPEN",
        payoutAmount: null,
      },
    });
  });
}

export async function settleSetPredictions(setId: string): Promise<void> {
  const set = await prisma.set.findUnique({
    where: { id: setId },
    include: {
      result: true,
      match: {
        include: {
          entry: {
            include: {
              slots: {
                include: {
                  player: {
                    select: { nickname: true, tier: true, race: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!set?.result) {
    return;
  }

  const openPredictions = await prisma.setPrediction.findMany({
    where: { setId, status: "OPEN" },
  });

  if (openPredictions.length === 0) {
    return;
  }

  const slots =
    set.match.entry?.slots.map((slot) => ({
      teamId: slot.teamId,
      setId: slot.setId,
      playerId: slot.playerId,
      player: slot.player,
    })) ?? [];

  const players = getSetEntryPlayers(
    set.id,
    set.match.homeTeamId,
    set.match.awayTeamId,
    slots,
  );

  if (!players.home || !players.away) {
    await prisma.$transaction(async (tx) => {
      for (const prediction of openPredictions) {
        await tx.discordWallet.upsert({
          where: { discordUserId: prediction.discordUserId },
          create: { discordUserId: prediction.discordUserId, points: prediction.stake },
          update: { points: { increment: prediction.stake } },
        });

        await tx.setPrediction.update({
          where: { id: prediction.id },
          data: {
            status: "REFUNDED",
            payoutAmount: prediction.stake,
          },
        });
      }
    });
    return;
  }

  const winnerPlayerId = set.result.winnerPlayerId;
  const pool = computePredictionPools(
    openPredictions,
    players.home.id,
    players.away.id,
  );
  const winningSidePool =
    winnerPlayerId === players.home.id ? pool.home : pool.away;

  await prisma.$transaction(async (tx) => {
    for (const prediction of openPredictions) {
      if (prediction.pickedPlayerId === winnerPlayerId) {
        const payoutAmount = computeWinnerPayout(
          prediction.stake,
          winningSidePool,
          pool.total,
        );

        await tx.discordWallet.upsert({
          where: { discordUserId: prediction.discordUserId },
          create: { discordUserId: prediction.discordUserId, points: payoutAmount },
          update: { points: { increment: payoutAmount } },
        });

        await tx.setPrediction.update({
          where: { id: prediction.id },
          data: {
            status: "WON",
            payoutAmount,
          },
        });
      } else {
        await tx.setPrediction.update({
          where: { id: prediction.id },
          data: {
            status: "LOST",
            payoutAmount: 0,
          },
        });
      }
    }
  });
}

export async function settleRemainingSetPredictionsForMatch(matchId: string): Promise<void> {
  const sets = await prisma.set.findMany({
    where: {
      matchId,
      result: { isNot: null },
    },
    select: { id: true },
  });

  for (const set of sets) {
    await settleSetPredictions(set.id);
  }
}
