import { getActiveSeason, getEntryDayMatches } from "@/lib/data";
import { isPredictionOpen } from "@/lib/prediction";
import {
  computePredictionOdds,
  computePredictionPools,
  formatOdds,
} from "@/lib/prediction-odds";
import { getWalletPoints } from "@/lib/points";
import { prisma } from "@/lib/prisma";

export async function buildPredictBoardPayload(discordUserId?: string | null) {
  const season = await getActiveSeason();

  if (!season) {
    return {
      points: 0,
      entryDayLabel: null,
      matches: [] as const,
    };
  }

  const matches = await getEntryDayMatches(season.id);
  const matchIds = matches.map((match) => match.id);

  const [openPredictions, myPredictions] = await Promise.all([
    prisma.matchPrediction.findMany({
      where: { matchId: { in: matchIds }, status: "OPEN" },
      select: { matchId: true, pickedTeamId: true, stake: true, status: true },
    }),
    discordUserId
      ? prisma.matchPrediction.findMany({
          where: { matchId: { in: matchIds }, discordUserId },
        })
      : Promise.resolve([]),
  ]);

  const myPredictionByMatch = new Map(myPredictions.map((item) => [item.matchId, item]));
  const openPredictionsByMatch = new Map<string, typeof openPredictions>();

  for (const prediction of openPredictions) {
    const list = openPredictionsByMatch.get(prediction.matchId) ?? [];
    list.push(prediction);
    openPredictionsByMatch.set(prediction.matchId, list);
  }

  const entryDayLabel =
    matches[0]?.scheduledAt?.toLocaleDateString("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      weekday: "short",
    }) ?? null;

  const points = discordUserId ? await getWalletPoints(discordUserId) : 0;

  return {
    points,
    entryDayLabel,
    matches: matches.map((match) => {
      const pool = computePredictionPools(
        openPredictionsByMatch.get(match.id) ?? [],
        match.homeTeamId,
        match.awayTeamId,
      );
      const odds = computePredictionOdds(pool);
      const myBet = myPredictionByMatch.get(match.id);

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
        odds: {
          home: odds.home,
          away: odds.away,
          homeLabel: formatOdds(odds.home),
          awayLabel: formatOdds(odds.away),
        },
        pools: pool,
        predictionOpen: isPredictionOpen(match),
        myBet: myBet
          ? {
              pickedTeamId: myBet.pickedTeamId,
              stake: myBet.stake,
              status: myBet.status,
              payoutAmount: myBet.payoutAmount,
            }
          : null,
      };
    }),
  };
}
