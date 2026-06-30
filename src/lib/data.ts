import { prisma } from "@/lib/prisma";
import { SEASON_COOKIE } from "@/lib/season-selection";
import { cookies } from "next/headers";
import { isVisibleOnScheduleTab } from "@/lib/schedule";
import { calculateMapStats } from "@/lib/map-stats";
import { buildDbStatsPayload } from "@/lib/race-matrix-stats";
import { calculatePlayerDetailStandings } from "@/lib/player-stats";
import {
  assignTeamStandingRanks,
  calculateTeamStandings,
  type MatchWithResults,
} from "@/lib/standings";

const matchInclude = {
  homeTeam: true,
  awayTeam: true,
  sets: {
    orderBy: { orderIndex: "asc" as const },
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
      slots: {
        include: { player: true },
      },
    },
  },
};

const seasonWithTeamsInclude = {
  teams: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      players: {
        where: { isActive: true },
        orderBy: [{ tier: "asc" as const }, { nickname: "asc" as const }],
      },
    },
  },
};

export async function getSelectedSeason() {
  const cookieStore = await cookies();
  const slug = cookieStore.get(SEASON_COOKIE)?.value;

  if (slug) {
    const selected = await prisma.season.findUnique({
      where: { slug },
      include: seasonWithTeamsInclude,
    });
    if (selected) {
      return selected;
    }
  }

  return prisma.season.findFirst({
    where: { isActive: true },
    include: seasonWithTeamsInclude,
  });
}

export async function getActiveSeason() {
  return getSelectedSeason();
}

export async function getSeasonBySlug(slug: string) {
  return prisma.season.findUnique({
    where: { slug },
    include: {
      teams: {
        orderBy: { sortOrder: "asc" },
        include: {
          players: {
            where: { isActive: true },
            orderBy: [{ tier: "asc" }, { nickname: "asc" }],
          },
        },
      },
    },
  });
}

export async function getAllSeasons() {
  return prisma.season.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getSeasonMatches(seasonId: string) {
  return prisma.match.findMany({
    where: { seasonId },
    include: matchInclude,
    orderBy: [{ week: "asc" }, { scheduledAt: "asc" }],
  });
}

export async function getScheduleMatches(seasonId: string) {
  const matches = await getSeasonMatches(seasonId);
  return matches.filter((match) => isVisibleOnScheduleTab(match));
}

export async function getCompletedMatches(seasonId: string) {
  const matches = await getSeasonMatches(seasonId);
  return matches.filter((match) => match.sets.some((set) => set.result));
}

export async function getResultInputMatches(seasonId: string) {
  return prisma.match.findMany({
    where: {
      seasonId,
      sets: { some: {} },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      sets: matchInclude.sets,
      entry: matchInclude.entry,
    },
    orderBy: [{ week: "asc" }, { scheduledAt: "asc" }],
  });
}

export async function getSeasonStandings(seasonId: string) {
  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      where: { seasonId },
      orderBy: { sortOrder: "asc" },
    }),
    getSeasonMatches(seasonId),
  ]);

  const standings = calculateTeamStandings(teams, matches as MatchWithResults[]);
  return assignTeamStandingRanks(standings, matches as MatchWithResults[]);
}

export async function getSeasonMapStats(seasonId: string) {
  const matches = await getSeasonMatches(seasonId);
  return calculateMapStats(matches);
}

export async function getSeasonDbStats(seasonId: string) {
  const matches = await getSeasonMatches(seasonId);
  return buildDbStatsPayload(matches);
}

export async function getSeasonPlayerStandings(seasonId: string) {
  const [players, matches] = await Promise.all([
    prisma.player.findMany({
      where: { team: { seasonId }, isActive: true },
      include: { team: true },
    }),
    getSeasonMatches(seasonId),
  ]);

  return calculatePlayerDetailStandings(players, matches as MatchWithResults[]);
}

const KOREA_TIMEZONE = "Asia/Seoul";

export function getKoreaDateKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function getEntryDayMatches(seasonId: string) {
  const anchor = await getNearestFutureEntryMatch(seasonId);
  if (!anchor?.scheduledAt) {
    return [];
  }

  const dateKey = getKoreaDateKey(anchor.scheduledAt);

  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      scheduledAt: { not: null },
      sets: { some: {} },
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      entry: true,
      sets: { select: { id: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { week: "asc" }],
  });

  return matches.filter(
    (match) => match.scheduledAt && getKoreaDateKey(match.scheduledAt) === dateKey,
  );
}

export async function getNearestFutureEntryMatch(seasonId: string) {
  const now = new Date();

  const matches = await prisma.match.findMany({
    where: {
      seasonId,
      status: { in: ["SCHEDULED", "IN_PROGRESS"] },
      sets: { some: {} },
      OR: [{ scheduledAt: { gte: now } }, { scheduledAt: null }],
    },
    include: {
      homeTeam: true,
      awayTeam: true,
      entry: true,
      sets: { select: { id: true } },
    },
    orderBy: [{ scheduledAt: "asc" }, { week: "asc" }],
  });

  return matches[0] ?? null;
}

export async function getMatchForEntry(matchId: string) {
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
      },
      entry: {
        include: {
          slots: {
            include: { player: true },
          },
        },
      },
    },
  });
}
