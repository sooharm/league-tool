import { MatchStatus, PrismaClient } from "@prisma/client";
import { buildStandardSets, SEASON_MATCH_SCHEDULE } from "../src/lib/schedule-config";

const prisma = new PrismaClient();

async function ensureStandardSets(matchId: string) {
  const sets = await prisma.set.findMany({
    where: { matchId },
    orderBy: { orderIndex: "asc" },
  });

  const template = buildStandardSets();

  for (const spec of template) {
    const existing = sets.find((set) => set.orderIndex === spec.orderIndex);
    if (existing) {
      continue;
    }

    await prisma.set.create({
      data: {
        matchId,
        orderIndex: spec.orderIndex,
        tierBracket: spec.tierBracket,
        mapName: null,
      },
    });
  }
}

async function main() {
  const season = await prisma.season.findFirst({ where: { isActive: true } });
  if (!season) {
    throw new Error("활성 시즌이 없습니다.");
  }

  const teams = await prisma.team.findMany({ where: { seasonId: season.id } });
  const teamByName = Object.fromEntries(teams.map((team) => [team.name, team.id]));

  let created = 0;
  let updated = 0;

  for (const item of SEASON_MATCH_SCHEDULE) {
    const homeTeamId = teamByName[item.homeTeam];
    const awayTeamId = teamByName[item.awayTeam];

    if (!homeTeamId || !awayTeamId) {
      throw new Error(`팀을 찾을 수 없습니다: ${item.homeTeam} vs ${item.awayTeam}`);
    }

    const scheduledAt = new Date(`${item.date}T21:00:00`);

    const existing = await prisma.match.findFirst({
      where: {
        seasonId: season.id,
        week: item.week,
        homeTeamId,
        awayTeamId,
      },
    });

    if (existing) {
      await prisma.match.update({
        where: { id: existing.id },
        data: {
          round: item.round,
          scheduledAt,
          status: MatchStatus.SCHEDULED,
        },
      });
      await ensureStandardSets(existing.id);
      updated += 1;
      continue;
    }

    const match = await prisma.match.create({
      data: {
        seasonId: season.id,
        week: item.week,
        round: item.round,
        homeTeamId,
        awayTeamId,
        scheduledAt,
        status: MatchStatus.SCHEDULED,
        sets: { create: buildStandardSets() },
      },
    });

    created += 1;
    console.log(`Created: ${item.week}주 ${item.homeTeam} vs ${item.awayTeam} (${match.id})`);
  }

  console.log(`Sync complete: created ${created}, updated ${updated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
