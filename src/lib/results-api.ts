import { syncMatchSixManFromResults } from "@/lib/entry-api";
import { entryPublishContext, getSetEntryPlayers, isPublished } from "@/lib/entry";
import { ensureEntryAutoPublishedSideEffects } from "@/lib/entry-api";
import {
  FORFEIT_PLAYER_VALUE,
  isForfeitPlayerValue,
  resolveMatchStatusAfterSave,
  type SetResultInput,
} from "@/lib/results";
import { settleRemainingSetPredictionsForMatch, settleSetPredictions } from "@/lib/points";
import { prisma } from "@/lib/prisma";
import type { TierBracket } from "@prisma/client";

export async function loadMatchForResults(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
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
      sets: {
        orderBy: { orderIndex: "asc" },
        include: {
          result: {
            include: {
              winnerPlayer: true,
              loserPlayer: true,
            },
          },
        },
      },
      entry: {
        include: {
          slots: { include: { player: true } },
        },
      },
    },
  });
}

export function buildResultsResponse(match: NonNullable<Awaited<ReturnType<typeof loadMatchForResults>>>) {
  const entrySlots =
    match.entry && isPublished(entryPublishContext(match.entry, match))
      ? match.entry.slots.map((slot) => ({
          teamId: slot.teamId,
          setId: slot.setId,
          playerId: slot.playerId,
          player: slot.player,
        }))
      : [];

  const sets = match.sets.map((set) => {
    const entryPlayers = getSetEntryPlayers(
      set.id,
      match.homeTeamId,
      match.awayTeamId,
      entrySlots,
    );

    let winnerSide: "home" | "away" | null = null;
    let homePlayerId = entryPlayers.home?.id ?? "";
    let awayPlayerId = entryPlayers.away?.id ?? "";

    if (set.result) {
      if (set.result.isForfeit) {
        if (set.result.winnerTeamId === match.homeTeamId) {
          winnerSide = "home";
          homePlayerId = set.result.winnerPlayerId;
          awayPlayerId = FORFEIT_PLAYER_VALUE;
        } else {
          winnerSide = "away";
          awayPlayerId = set.result.winnerPlayerId;
          homePlayerId = FORFEIT_PLAYER_VALUE;
        }
      } else if (set.result.winnerTeamId === match.homeTeamId) {
        winnerSide = "home";
        homePlayerId = set.result.winnerPlayerId;
        awayPlayerId = set.result.loserPlayerId ?? "";
      } else {
        winnerSide = "away";
        homePlayerId = set.result.loserPlayerId ?? "";
        awayPlayerId = set.result.winnerPlayerId;
      }
    }

    return {
      id: set.id,
      orderIndex: set.orderIndex,
      tierBracket: set.tierBracket,
      mapName: set.mapName,
      hasResult: !!set.result,
      defaults: {
        homePlayerId: entryPlayers.home?.id ?? null,
        awayPlayerId: entryPlayers.away?.id ?? null,
      },
      current: {
        homePlayerId: homePlayerId || null,
        awayPlayerId: awayPlayerId || null,
        winnerSide,
      },
    };
  });

  return {
    match: {
      id: match.id,
      week: match.week,
      round: match.round,
      scheduledAt: match.scheduledAt,
      bjName: match.bjName,
      status: match.status,
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        color: match.homeTeam.color,
        players: match.homeTeam.players,
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        color: match.awayTeam.color,
        players: match.awayTeam.players,
      },
      sets,
    },
    entryPublished: !!match.entry && isPublished(entryPublishContext(match.entry, match)),
  };
}

export async function validateAndSaveResults(
  matchId: string,
  results: SetResultInput[],
  playedAt?: string,
  bjName?: string,
) {
  const match = await loadMatchForResults(matchId);
  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const setIds = new Set(match.sets.map((set) => set.id));
  const playedAtDate = playedAt ? new Date(playedAt) : new Date();

  for (const result of results) {
    if (!setIds.has(result.setId)) {
      throw new Error("INVALID_SET");
    }

    if (result.mapName !== undefined) {
      await prisma.set.update({
        where: { id: result.setId },
        data: { mapName: result.mapName.trim() || null },
      });
    }

    const { homePlayerId, awayPlayerId, winnerSide } = result;
    if (!homePlayerId || !awayPlayerId || !winnerSide) {
      continue;
    }

    const homeForfeit = isForfeitPlayerValue(homePlayerId);
    const awayForfeit = isForfeitPlayerValue(awayPlayerId);

    if (homeForfeit && awayForfeit) {
      throw new Error("BOTH_FORFEIT");
    }

    if (homeForfeit || awayForfeit) {
      const resolvedWinnerSide = homeForfeit ? "away" : "home";
      if (winnerSide !== resolvedWinnerSide) {
        throw new Error("FORFEIT_WINNER_MISMATCH");
      }

      const winnerPlayerId = resolvedWinnerSide === "home" ? homePlayerId : awayPlayerId;
      const winnerPlayer = (
        resolvedWinnerSide === "home" ? match.homeTeam.players : match.awayTeam.players
      ).find((player) => player.id === winnerPlayerId);

      if (!winnerPlayer) {
        throw new Error("INVALID_PLAYERS");
      }

      const winnerTeamId = resolvedWinnerSide === "home" ? match.homeTeamId : match.awayTeamId;
      const loserTeamId = resolvedWinnerSide === "home" ? match.awayTeamId : match.homeTeamId;

      await prisma.setResult.upsert({
        where: { setId: result.setId },
        create: {
          setId: result.setId,
          winnerTeamId,
          loserTeamId,
          winnerPlayerId,
          loserPlayerId: null,
          isForfeit: true,
          playedAt: playedAtDate,
        },
        update: {
          winnerTeamId,
          loserTeamId,
          winnerPlayerId,
          loserPlayerId: null,
          isForfeit: true,
          playedAt: playedAtDate,
        },
      });
      await settleSetPredictions(result.setId);
      continue;
    }

    const homePlayer = match.homeTeam.players.find((player) => player.id === homePlayerId);
    const awayPlayer = match.awayTeam.players.find((player) => player.id === awayPlayerId);

    if (!homePlayer || !awayPlayer) {
      throw new Error("INVALID_PLAYERS");
    }

    if (homePlayerId === awayPlayerId) {
      throw new Error("SAME_PLAYER");
    }

    const winnerPlayerId = winnerSide === "home" ? homePlayerId : awayPlayerId;
    const loserPlayerId = winnerSide === "home" ? awayPlayerId : homePlayerId;
    const winnerTeamId = winnerSide === "home" ? match.homeTeamId : match.awayTeamId;
    const loserTeamId = winnerSide === "home" ? match.awayTeamId : match.homeTeamId;

    await prisma.setResult.upsert({
      where: { setId: result.setId },
      create: {
        setId: result.setId,
        winnerTeamId,
        loserTeamId,
        winnerPlayerId,
        loserPlayerId,
        isForfeit: false,
        playedAt: playedAtDate,
      },
      update: {
        winnerTeamId,
        loserTeamId,
        winnerPlayerId,
        loserPlayerId,
        isForfeit: false,
        playedAt: playedAtDate,
      },
    });
    await settleSetPredictions(result.setId);
  }

  const refreshed = await loadMatchForResults(matchId);
  if (!refreshed) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const savedCount = refreshed.sets.filter((set) => set.result).length;
  const status = resolveMatchStatusAfterSave(refreshed.sets.length, savedCount);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status,
      ...(bjName !== undefined ? { bjName: bjName.trim() || null } : {}),
    },
  });

  await syncMatchSixManFromResults(matchId);

  if (status === "COMPLETED") {
    await settleRemainingSetPredictionsForMatch(matchId);
  }

  const synced = await loadMatchForResults(matchId);
  if (!synced) {
    throw new Error("MATCH_NOT_FOUND");
  }

  return buildResultsResponse({ ...synced, status });
}

export async function addMatchSet(matchId: string, tierBracket: TierBracket = "ACE") {
  const match = await loadMatchForResults(matchId);
  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (tierBracket === "ACE" && match.sets.some((set) => set.tierBracket === "ACE")) {
    throw new Error("ACE_SET_EXISTS");
  }

  const maxOrder = match.sets.reduce((max, set) => Math.max(max, set.orderIndex), 0);

  await prisma.set.create({
    data: {
      matchId,
      orderIndex: maxOrder + 1,
      tierBracket,
      mapName: null,
    },
  });

  const refreshed = await loadMatchForResults(matchId);
  if (!refreshed) {
    throw new Error("MATCH_NOT_FOUND");
  }

  return buildResultsResponse(refreshed);
}

export async function removeAceSet(matchId: string, setId: string) {
  const match = await loadMatchForResults(matchId);
  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const set = match.sets.find((item) => item.id === setId);
  if (!set) {
    throw new Error("SET_NOT_FOUND");
  }
  if (set.tierBracket !== "ACE") {
    throw new Error("NOT_ACE_SET");
  }

  await prisma.set.delete({ where: { id: setId } });

  const refreshed = await loadMatchForResults(matchId);
  if (!refreshed) {
    throw new Error("MATCH_NOT_FOUND");
  }

  const savedCount = refreshed.sets.filter((item) => item.result).length;
  const status = resolveMatchStatusAfterSave(refreshed.sets.length, savedCount);

  await prisma.match.update({
    where: { id: matchId },
    data: { status },
  });

  await syncMatchSixManFromResults(matchId);

  if (status === "COMPLETED") {
    await settleRemainingSetPredictionsForMatch(matchId);
  }

  const synced = await loadMatchForResults(matchId);
  if (!synced) {
    throw new Error("MATCH_NOT_FOUND");
  }

  return buildResultsResponse(synced);
}
