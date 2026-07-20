import { getSeasonBySlug, getSelectedSeason } from "@/lib/data";
import { DEFAULT_PRO_LEAGUE_SEASON_SLUG } from "@/lib/season-selection";
import {
  defaultSets,
  type MatchAdminInput,
  validateMatchInput,
} from "@/lib/match-admin";
import { prisma } from "@/lib/prisma";
import type { MatchStatus } from "@prisma/client";

const matchDetailInclude = {
  homeTeam: true,
  awayTeam: true,
  sets: {
    orderBy: { orderIndex: "asc" as const },
    include: { result: true },
  },
  entry: true,
};

export async function getActiveSeasonForMatchAdmin() {
  const season = await getSelectedSeason();
  if (!season) {
    return null;
  }

  return getSeasonForMatchAdmin(season.id);
}

export async function getSeason4ForMatchAdmin() {
  const season = await getSeasonBySlug(DEFAULT_PRO_LEAGUE_SEASON_SLUG);
  if (!season) {
    return null;
  }

  return getSeasonForMatchAdmin(season.id);
}

async function getSeasonForMatchAdmin(seasonId: string) {
  return prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      teams: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function listSeasonMatches(seasonId: string) {
  return prisma.match.findMany({
    where: { seasonId },
    include: {
      homeTeam: true,
      awayTeam: true,
      sets: {
        orderBy: { orderIndex: "asc" },
        include: { result: true },
      },
    },
    orderBy: [{ week: "asc" }, { scheduledAt: "asc" }],
  });
}

export async function getMatchAdminDetail(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: matchDetailInclude,
  });
}

async function syncSets(matchId: string, sets: MatchAdminInput["sets"]) {
  const existing = await prisma.set.findMany({ where: { matchId } });
  const keepIds = new Set(sets.filter((set) => set.id).map((set) => set.id!));

  for (const set of existing) {
    if (!keepIds.has(set.id)) {
      await prisma.set.delete({ where: { id: set.id } });
    }
  }

  for (const set of sets) {
    const data = {
      orderIndex: set.orderIndex,
      tierBracket: set.tierBracket,
      mapName: set.mapName?.trim() || null,
    };

    if (set.id) {
      await prisma.set.update({
        where: { id: set.id },
        data,
      });
    } else {
      await prisma.set.create({
        data: {
          matchId,
          ...data,
        },
      });
    }
  }
}

async function clearMatchDependentsOnTeamChange(matchId: string) {
  await prisma.setResult.deleteMany({ where: { set: { matchId } } });
  await prisma.matchEntry.deleteMany({ where: { matchId } });
}

export async function createMatch(seasonId: string, input: MatchAdminInput) {
  const error = validateMatchInput(input);
  if (error) throw new Error(error);

  const teams = await prisma.team.findMany({ where: { seasonId } });
  const teamIds = new Set(teams.map((team) => team.id));
  if (!teamIds.has(input.homeTeamId) || !teamIds.has(input.awayTeamId)) {
    throw new Error("INVALID_TEAMS");
  }

  const match = await prisma.match.create({
    data: {
      seasonId,
      week: input.week,
      round: input.round,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      status: input.status,
      countsTowardStandings: input.countsTowardStandings !== false,
    },
  });

  await syncSets(match.id, input.sets);

  return getMatchAdminDetail(match.id);
}

export async function updateMatch(matchId: string, input: MatchAdminInput) {
  const error = validateMatchInput(input);
  if (error) throw new Error(error);

  const existing = await prisma.match.findUnique({ where: { id: matchId } });
  if (!existing) throw new Error("MATCH_NOT_FOUND");

  const teams = await prisma.team.findMany({ where: { seasonId: existing.seasonId } });
  const teamIds = new Set(teams.map((team) => team.id));
  if (!teamIds.has(input.homeTeamId) || !teamIds.has(input.awayTeamId)) {
    throw new Error("INVALID_TEAMS");
  }

  const teamsChanged =
    existing.homeTeamId !== input.homeTeamId || existing.awayTeamId !== input.awayTeamId;

  if (teamsChanged) {
    await clearMatchDependentsOnTeamChange(matchId);
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      week: input.week,
      round: input.round,
      homeTeamId: input.homeTeamId,
      awayTeamId: input.awayTeamId,
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      status: input.status,
      countsTowardStandings: input.countsTowardStandings !== false,
    },
  });

  await syncSets(matchId, input.sets);

  return getMatchAdminDetail(matchId);
}

export async function deleteMatch(matchId: string) {
  const existing = await prisma.match.findUnique({ where: { id: matchId } });
  if (!existing) throw new Error("MATCH_NOT_FOUND");

  await prisma.match.delete({ where: { id: matchId } });
}

export function buildMatchAdminPayload(
  season: NonNullable<Awaited<ReturnType<typeof getActiveSeasonForMatchAdmin>>>,
) {
  return {
    season: {
      id: season.id,
      name: season.name,
    },
    teams: season.teams.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
    })),
  };
}

export function matchToAdminInput(
  match: NonNullable<Awaited<ReturnType<typeof getMatchAdminDetail>>>,
): MatchAdminInput {
  return {
    week: match.week,
    round: match.round,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    scheduledAt: match.scheduledAt?.toISOString() ?? null,
    status: match.status as MatchStatus,
    countsTowardStandings: match.countsTowardStandings,
    sets: match.sets.map((set) => ({
      id: set.id,
      orderIndex: set.orderIndex,
      tierBracket: set.tierBracket,
      mapName: set.mapName,
    })),
  };
}

export { defaultSets };
