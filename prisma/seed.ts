import {
  MatchStatus,
  PlayerRole,
  PrismaClient,
  Race,
} from "@prisma/client";
import { DEFAULT_RULES_TEXT } from "../src/lib/default-rules";
import { buildStandardSets, SEASON_MATCH_SCHEDULE } from "../src/lib/schedule-config";

const prisma = new PrismaClient();

type PlayerSeed = {
  nickname: string;
  race: Race;
  tier: number;
  role?: PlayerRole;
};

const teams = [
  {
    name: "피나무라",
    color: "#60a5fa",
    players: [
      { nickname: "Lightseek", race: "P", tier: 1, role: "CAPTAIN" },
      { nickname: "P.O", race: "T", tier: 1, role: "VICE_CAPTAIN" },
      { nickname: "Swan", race: "P", tier: 2 },
      { nickname: "Pray", race: "Z", tier: 2 },
      { nickname: "likko", race: "T", tier: 3 },
      { nickname: "forreal", race: "P", tier: 4 },
      { nickname: "Star", race: "Z", tier: 5 },
    ] satisfies PlayerSeed[],
  },
  {
    name: "에스트로겐",
    color: "#c084fc",
    players: [
      { nickname: "Sooharm", race: "T", tier: 1, role: "CAPTAIN" },
      { nickname: "Closer", race: "Z", tier: 2 },
      { nickname: "Best", race: "P", tier: 3 },
      { nickname: "GS", race: "T", tier: 4 },
      { nickname: "Jaehee", race: "Z", tier: 5 },
    ] satisfies PlayerSeed[],
  },
  {
    name: "블로우잡",
    color: "#fb923c",
    players: [
      { nickname: "Onkel", race: "T", tier: 1, role: "CAPTAIN" },
      { nickname: "Coru2", race: "P", tier: 2 },
      { nickname: "Mamba", race: "Z", tier: 3 },
      { nickname: "Comeback", race: "T", tier: 4 },
      { nickname: "Scarlet", race: "P", tier: 5 },
    ] satisfies PlayerSeed[],
  },
  {
    name: "언제나상한가",
    color: "#f87171",
    players: [
      { nickname: "momo", race: "P", tier: 1, role: "CAPTAIN" },
      { nickname: "Babi", race: "Z", tier: 2 },
      { nickname: "forreal", race: "T", tier: 3 },
    ] satisfies PlayerSeed[],
  },
];

async function main() {
  await prisma.entrySlot.deleteMany();
  await prisma.matchEntry.deleteMany();
  await prisma.setResult.deleteMany();
  await prisma.set.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.season.deleteMany();

  const season = await prisma.season.create({
    data: {
      name: "나무클랜 개인팀리그 시즌4",
      slug: "season-4",
      isActive: true,
      teamCount: 4,
      rulesText: DEFAULT_RULES_TEXT,
    },
  });

  const createdTeams: Record<string, string> = {};

  for (const [index, team] of teams.entries()) {
    const created = await prisma.team.create({
      data: {
        seasonId: season.id,
        name: team.name,
        color: team.color,
        sortOrder: index,
        players: {
          create: team.players.map((player) => ({
            nickname: player.nickname,
            race: player.race,
            tier: player.tier,
            role: player.role ?? "MEMBER",
          })),
        },
      },
    });

    createdTeams[team.name] = created.id;
  }

  for (const item of SEASON_MATCH_SCHEDULE) {
    const homeTeamId = createdTeams[item.homeTeam];
    const awayTeamId = createdTeams[item.awayTeam];

    if (!homeTeamId || !awayTeamId) {
      throw new Error(`팀을 찾을 수 없습니다: ${item.homeTeam} vs ${item.awayTeam}`);
    }

    await prisma.match.create({
      data: {
        seasonId: season.id,
        week: item.week,
        round: item.round,
        homeTeamId,
        awayTeamId,
        scheduledAt: new Date(`${item.date}T21:00:00`),
        status: MatchStatus.SCHEDULED,
        sets: { create: buildStandardSets() },
      },
    });
  }

  console.log("Seed complete:", season.name, `(${SEASON_MATCH_SCHEDULE.length}경기)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
