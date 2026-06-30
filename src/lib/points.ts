import { isPredictionOpen } from "@/lib/prediction";
import { computePredictionPools, computeWinnerPayout } from "@/lib/prediction-odds";
import { prisma } from "@/lib/prisma";
import { getMatchWinner, type MatchWithResults } from "@/lib/standings";

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

export async function placePredictionBet({
  discordUserId,
  matchId,
  pickedTeamId,
  stake,
}: {
  discordUserId: string;
  matchId: string;
  pickedTeamId: string;
  stake: number;
}) {
  if (!Number.isInteger(stake) || stake < MIN_PREDICTION_STAKE || stake > MAX_PREDICTION_STAKE) {
    throw new Error("INVALID_STAKE");
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      entry: true,
      sets: { select: { id: true } },
    },
  });

  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (pickedTeamId !== match.homeTeamId && pickedTeamId !== match.awayTeamId) {
    throw new Error("INVALID_TEAM");
  }

  if (!isPredictionOpen(match)) {
    throw new Error("PREDICTION_CLOSED");
  }

  return prisma.$transaction(async (tx) => {
    await ensureWallet(tx, discordUserId);

    const existing = await tx.matchPrediction.findUnique({
      where: {
        matchId_discordUserId: {
          matchId,
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

    return tx.matchPrediction.upsert({
      where: {
        matchId_discordUserId: {
          matchId,
          discordUserId,
        },
      },
      create: {
        matchId,
        discordUserId,
        pickedTeamId,
        stake,
        status: "OPEN",
      },
      update: {
        pickedTeamId,
        stake,
        status: "OPEN",
        payoutAmount: null,
      },
    });
  });
}

export async function settleMatchPredictions(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: true,
      awayTeam: true,
      sets: {
        orderBy: { orderIndex: "asc" },
        include: { result: true },
      },
      entry: {
        include: {
          slots: {
            select: { teamId: true, setId: true, playerId: true },
          },
        },
      },
    },
  });

  if (!match || match.status !== "COMPLETED") {
    return;
  }

  const openPredictions = await prisma.matchPrediction.findMany({
    where: { matchId, status: "OPEN" },
  });

  if (openPredictions.length === 0) {
    return;
  }

  const winnerTeamId = getMatchWinner(match as MatchWithResults);

  if (!winnerTeamId) {
    await prisma.$transaction(async (tx) => {
      for (const prediction of openPredictions) {
        await tx.discordWallet.upsert({
          where: { discordUserId: prediction.discordUserId },
          create: { discordUserId: prediction.discordUserId, points: prediction.stake },
          update: { points: { increment: prediction.stake } },
        });

        await tx.matchPrediction.update({
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

  const pool = computePredictionPools(
    openPredictions,
    match.homeTeamId,
    match.awayTeamId,
  );
  const winningSidePool =
    winnerTeamId === match.homeTeamId ? pool.home : pool.away;

  await prisma.$transaction(async (tx) => {
    for (const prediction of openPredictions) {
      if (prediction.pickedTeamId === winnerTeamId) {
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

        await tx.matchPrediction.update({
          where: { id: prediction.id },
          data: {
            status: "WON",
            payoutAmount,
          },
        });
      } else {
        await tx.matchPrediction.update({
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
