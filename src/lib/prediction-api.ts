import { isDevPredictPreviewEnabled } from "@/lib/dev-predict";
import {
  getActiveSeason,
  getPredictPreviewMatches,
  resolvePredictDisplayMatch,
  type PredictBoardMode,
  type PredictMatchWithInclude,
} from "@/lib/data";
import {
  getEntrySubmissionSets,
  getSetEntryPlayers,
  isPublished,
  type EntrySlotPlayer,
} from "@/lib/entry";
import { isPredictionOpen, isSetPredictionOpen, toPredictionEntryContext } from "@/lib/prediction";
import {
  computeFinalPredictionPools,
  computePredictionOdds,
  computePredictionPools,
  formatOdds,
} from "@/lib/prediction-odds";
import { getTopWalletPointsRanks, getWalletPoints } from "@/lib/points";
import { prisma } from "@/lib/prisma";

const PREVIEW_SAMPLE_POOL = { home: 40, away: 25, total: 65 };

type PredictMatch = PredictMatchWithInclude;

type PlayerInfo = {
  id: string;
  nickname: string;
  tier: number;
  race: string;
};

function toPlayerInfo(player: {
  id: string;
  nickname: string;
  tier: number;
  race: string;
}): PlayerInfo {
  return {
    id: player.id,
    nickname: player.nickname,
    tier: player.tier,
    race: player.race,
  };
}

function toEntrySlots(match: PredictMatch): EntrySlotPlayer[] {
  return (
    match.entry?.slots.map((slot) => ({
      teamId: slot.teamId,
      setId: slot.setId,
      playerId: slot.playerId,
      player: slot.player,
    })) ?? []
  );
}

function previewPlayersForSet(
  match: PredictMatch,
  setIndex: number,
): { home: PlayerInfo | null; away: PlayerInfo | null } {
  const homeRoster = match.homeTeam.players;
  const awayRoster = match.awayTeam.players;

  if (homeRoster.length === 0 || awayRoster.length === 0) {
    return { home: null, away: null };
  }

  const home = homeRoster[setIndex % homeRoster.length];
  const away = awayRoster[setIndex % awayRoster.length];

  return {
    home: toPlayerInfo(home),
    away: toPlayerInfo(away),
  };
}

function resolveSetPlayers(
  match: PredictMatch,
  setId: string,
  setIndex: number,
  slots: EntrySlotPlayer[],
  previewMode: boolean,
): { home: PlayerInfo | null; away: PlayerInfo | null } {
  const fromEntry = getSetEntryPlayers(setId, match.homeTeamId, match.awayTeamId, slots);

  if (fromEntry.home && fromEntry.away) {
    return fromEntry;
  }

  if (previewMode) {
    return previewPlayersForSet(match, setIndex);
  }

  return {
    home: fromEntry.home,
    away: fromEntry.away,
  };
}

async function loadOpenSetPredictions(setIds: string[]) {
  if (setIds.length === 0) {
    return [];
  }

  try {
    return await prisma.setPrediction.findMany({
      where: { setId: { in: setIds }, status: "OPEN" },
      select: { setId: true, pickedPlayerId: true, stake: true, status: true },
    });
  } catch (error) {
    if (isDevPredictPreviewEnabled()) {
      console.error("[predict] preview mode: open predictions unavailable", error);
      return [];
    }

    throw error;
  }
}

async function loadSetPredictionsForOdds(setIds: string[]) {
  if (setIds.length === 0) {
    return [];
  }

  try {
    return await prisma.setPrediction.findMany({
      where: {
        setId: { in: setIds },
        status: { not: "REFUNDED" },
      },
      select: { setId: true, pickedPlayerId: true, stake: true, status: true },
    });
  } catch (error) {
    if (isDevPredictPreviewEnabled()) {
      console.error("[predict] preview mode: set predictions for odds unavailable", error);
      return [];
    }

    throw error;
  }
}

async function loadMySetPredictions(setIds: string[], discordUserId: string) {
  if (setIds.length === 0) {
    return [];
  }

  try {
    return await prisma.setPrediction.findMany({
      where: { setId: { in: setIds }, discordUserId },
    });
  } catch (error) {
    if (isDevPredictPreviewEnabled()) {
      console.error("[predict] preview mode: my predictions unavailable", error);
      return [];
    }

    throw error;
  }
}

function isEntryPublishedForPredict(match: PredictMatch, previewMode: boolean, now = new Date()) {
  if (previewMode) {
    return true;
  }

  return isPublished(toPredictionEntryContext(match), now);
}

function buildResultsSetPayload(
  match: PredictMatch,
  set: PredictMatch["sets"][number],
  setIndex: number,
  slots: EntrySlotPlayer[],
  setPredictions: { setId: string; pickedPlayerId: string; stake: number; status: string }[],
  myBet: Awaited<ReturnType<typeof loadMySetPredictions>>[number] | undefined,
) {
  const players = resolveSetPlayers(match, set.id, setIndex, slots, false);
  const winnerPlayer = set.result?.winnerPlayer
    ? toPlayerInfo(set.result.winnerPlayer)
    : null;

  let pool = { home: 0, away: 0, total: 0 };
  let odds = { home: 0, away: 0, homeLabel: "-", awayLabel: "-" };

  if (players.home && players.away) {
    pool = computeFinalPredictionPools(
      setPredictions.filter((item) => item.setId === set.id),
      players.home.id,
      players.away.id,
    );
    const computed = computePredictionOdds(pool);
    odds = {
      home: computed.home,
      away: computed.away,
      homeLabel: formatOdds(computed.home),
      awayLabel: formatOdds(computed.away),
    };
  }

  return {
    setId: set.id,
    orderIndex: set.orderIndex,
    tierBracket: set.tierBracket,
    homePlayer: players.home,
    awayPlayer: players.away,
    winnerPlayer,
    odds,
    pools: pool,
    predictionOpen: false,
    playersPublished: true,
    playersReady: !!(players.home && players.away),
    hasResult: !!set.result,
    myBet: myBet
      ? {
          pickedPlayerId: myBet.pickedPlayerId,
          stake: myBet.stake,
          status: myBet.status,
          payoutAmount: myBet.payoutAmount,
        }
      : null,
  };
}

function buildUpcomingSetPayload(
  match: PredictMatch,
  set: PredictMatch["sets"][number],
  setIndex: number,
  slots: EntrySlotPlayer[],
  openPredictions: { setId: string; pickedPlayerId: string; stake: number; status: string }[],
  myBet: Awaited<ReturnType<typeof loadMySetPredictions>>[number] | undefined,
  previewMode: boolean,
  bettingClosed = false,
) {
  const playersPublished = isEntryPublishedForPredict(match, previewMode);

  if (!playersPublished) {
    return {
      setId: set.id,
      orderIndex: set.orderIndex,
      tierBracket: set.tierBracket,
      homePlayer: null,
      awayPlayer: null,
      winnerPlayer: null,
      odds: {
        home: 0,
        away: 0,
        homeLabel: "-",
        awayLabel: "-",
      },
      pools: { home: 0, away: 0, total: 0 },
      predictionOpen: false,
      playersPublished: false,
      playersReady: false,
      hasResult: !!set.result,
      myBet: null,
    };
  }

  const players = resolveSetPlayers(match, set.id, setIndex, slots, previewMode);

  let pool = { home: 0, away: 0, total: 0 };
  if (players.home && players.away) {
    pool = computePredictionPools(
      openPredictions.filter((item) => item.setId === set.id),
      players.home.id,
      players.away.id,
    );

    if (previewMode && pool.total === 0) {
      pool = { ...PREVIEW_SAMPLE_POOL };
    }
  }

  const odds = computePredictionOdds(pool);
  const playersReady = !!(players.home && players.away);
  const predictionOpen =
    !bettingClosed &&
    playersReady &&
    (isSetPredictionOpen(match, set, slots) ||
      (previewMode && isPredictionOpen(match) && !set.result));

  return {
    setId: set.id,
    orderIndex: set.orderIndex,
    tierBracket: set.tierBracket,
    homePlayer: players.home,
    awayPlayer: players.away,
    winnerPlayer: null,
    odds: {
      home: odds.home,
      away: odds.away,
      homeLabel: formatOdds(odds.home),
      awayLabel: formatOdds(odds.away),
    },
    pools: pool,
    predictionOpen,
    playersPublished: true,
    playersReady,
    hasResult: !!set.result,
    myBet: myBet
      ? {
          pickedPlayerId: myBet.pickedPlayerId,
          stake: myBet.stake,
          status: myBet.status,
          payoutAmount: myBet.payoutAmount,
        }
      : null,
  };
}

function buildMatchPayload(
  match: PredictMatch,
  boardMode: PredictBoardMode,
  setPredictions: { setId: string; pickedPlayerId: string; stake: number; status: string }[],
  myPredictionBySet: Map<string, Awaited<ReturnType<typeof loadMySetPredictions>>[number]>,
  previewMode: boolean,
) {
  const slots = toEntrySlots(match);
  const submissionSets = getEntrySubmissionSets(match.sets);

  return {
    matchId: match.id,
    week: match.week,
    round: match.round,
    scheduledAt: match.scheduledAt?.toISOString() ?? null,
    status: match.status,
    homeTeam: {
      id: match.homeTeam.id,
      name: match.homeTeam.name,
      color: match.homeTeam.color,
    },
    awayTeam: {
      id: match.awayTeam.id,
      name: match.awayTeam.name,
      color: match.awayTeam.color,
    },
    predictionOpen: boardMode === "upcoming" ? isPredictionOpen(match) : false,
    sets: submissionSets.map((set, index) => {
      const myBet = myPredictionBySet.get(set.id);

      if (boardMode === "results") {
        return buildResultsSetPayload(match, set, index, slots, setPredictions, myBet);
      }

      return buildUpcomingSetPayload(
        match,
        set,
        index,
        slots,
        setPredictions,
        myBet,
        previewMode,
        boardMode === "closed",
      );
    }),
  };
}

export async function buildPredictBoardPayload(discordUserId?: string | null) {
  const previewMode = isDevPredictPreviewEnabled();
  const season = await getActiveSeason();

  if (!season) {
    return {
      previewMode,
      boardMode: "upcoming" as const,
      points: 0,
      topPointsRanks: [] as number[],
      entryDayLabel: null,
      matches: [] as const,
    };
  }

  let boardMode: PredictBoardMode = "upcoming";
  let matches: PredictMatch[] = [];
  let usingPreviewFallback = false;

  if (previewMode) {
    const previewMatches = await getPredictPreviewMatches(season.id);
    if (previewMatches.length > 0) {
      matches = previewMatches;
      usingPreviewFallback = true;
    }
  }

  if (matches.length === 0) {
    const resolved = await resolvePredictDisplayMatch(season.id);
    if (resolved) {
      matches = [resolved.match];
      boardMode = resolved.mode;
    }
  }

  const entrySets = matches.flatMap((match) =>
    getEntrySubmissionSets(match.sets).map((set) => set.id),
  );

  const [setPredictions, myPredictions, topPointsRanks] = await Promise.all([
    boardMode === "results"
      ? loadSetPredictionsForOdds(entrySets)
      : boardMode === "upcoming" || boardMode === "closed"
        ? loadOpenSetPredictions(entrySets)
        : Promise.resolve([]),
    discordUserId ? loadMySetPredictions(entrySets, discordUserId) : Promise.resolve([]),
    getTopWalletPointsRanks(3),
  ]);

  const myPredictionBySet = new Map(myPredictions.map((item) => [item.setId, item]));

  const entryDayLabel =
    matches[0]?.scheduledAt?.toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      weekday: "short",
    }) ?? null;

  const points = discordUserId ? await getWalletPoints(discordUserId) : 0;

  return {
    previewMode,
    usingPreviewFallback,
    boardMode,
    points,
    topPointsRanks,
    entryDayLabel,
    matches: matches.map((match) =>
      buildMatchPayload(match, boardMode, setPredictions, myPredictionBySet, previewMode),
    ),
  };
}
