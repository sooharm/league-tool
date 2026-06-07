import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";

type SqliteRow = Record<string, unknown>;

const SQLITE_PATH = "prisma/dev.db";

const prisma = new PrismaClient();

function readAll(db: Database.Database, table: string): SqliteRow[] {
  return db.prepare(`SELECT * FROM "${table}"`).all() as SqliteRow[];
}

function asString(value: unknown) {
  return String(value);
}

function asNumber(value: unknown) {
  return Number(value);
}

function asBool(value: unknown) {
  return Boolean(value);
}

function asDate(value: unknown) {
  if (value == null) return null;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function optionalDate(value: unknown) {
  const date = asDate(value);
  return date ?? undefined;
}

async function clearNeon() {
  await prisma.entrySlot.deleteMany();
  await prisma.setResult.deleteMany();
  await prisma.matchEntry.deleteMany();
  await prisma.set.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();
  await prisma.team.deleteMany();
  await prisma.season.deleteMany();
}

async function main() {
  const sqlite = new Database(SQLITE_PATH, { readonly: true });

  const seasons = readAll(sqlite, "Season");
  const teams = readAll(sqlite, "Team");
  const players = readAll(sqlite, "Player");
  const matches = readAll(sqlite, "Match");
  const sets = readAll(sqlite, "Set");
  const setResults = readAll(sqlite, "SetResult");
  const matchEntries = readAll(sqlite, "MatchEntry");
  const entrySlots = readAll(sqlite, "EntrySlot");

  console.log("SQLite:", {
    seasons: seasons.length,
    teams: teams.length,
    players: players.length,
    matches: matches.length,
    sets: sets.length,
    setResults: setResults.length,
    matchEntries: matchEntries.length,
    entrySlots: entrySlots.length,
  });

  if (setResults.length === 0 && matches.length === 0) {
    throw new Error("SQLite에 옮길 데이터가 없습니다.");
  }

  await clearNeon();

  const seasonIdMap = new Map<string, string>();
  const teamIdMap = new Map<string, string>();
  const playerIdMap = new Map<string, string>();
  const matchIdMap = new Map<string, string>();
  const setIdMap = new Map<string, string>();
  const entryIdMap = new Map<string, string>();

  for (const row of seasons) {
    const created = await prisma.season.create({
      data: {
        name: asString(row.name),
        slug: asString(row.slug),
        isActive: asBool(row.isActive),
        teamCount: asNumber(row.teamCount),
        rulesText: row.rulesText == null ? null : asString(row.rulesText),
        createdAt: optionalDate(row.createdAt),
        updatedAt: optionalDate(row.updatedAt),
      },
    });
    seasonIdMap.set(asString(row.id), created.id);
  }

  for (const row of teams) {
    const seasonId = seasonIdMap.get(asString(row.seasonId));
    if (!seasonId) continue;

    const created = await prisma.team.create({
      data: {
        seasonId,
        name: asString(row.name),
        shortName: row.shortName == null ? null : asString(row.shortName),
        color: asString(row.color),
        sortOrder: asNumber(row.sortOrder),
      },
    });
    teamIdMap.set(asString(row.id), created.id);
  }

  for (const row of players) {
    const teamId = teamIdMap.get(asString(row.teamId));
    if (!teamId) continue;

    const created = await prisma.player.create({
      data: {
        teamId,
        nickname: asString(row.nickname),
        race: asString(row.race) as "P" | "T" | "Z",
        tier: asNumber(row.tier),
        role: asString(row.role) as "MEMBER" | "CAPTAIN" | "VICE_CAPTAIN",
        isActive: asBool(row.isActive),
        discordUserId:
          row.discordUserId == null || row.discordUserId === ""
            ? null
            : asString(row.discordUserId),
      },
    });
    playerIdMap.set(asString(row.id), created.id);
  }

  for (const row of matches) {
    const seasonId = seasonIdMap.get(asString(row.seasonId));
    const homeTeamId = teamIdMap.get(asString(row.homeTeamId));
    const awayTeamId = teamIdMap.get(asString(row.awayTeamId));
    if (!seasonId || !homeTeamId || !awayTeamId) continue;

    const created = await prisma.match.create({
      data: {
        seasonId,
        week: asNumber(row.week),
        round: asNumber(row.round),
        homeTeamId,
        awayTeamId,
        scheduledAt: asDate(row.scheduledAt),
        bjName: row.bjName == null ? null : asString(row.bjName),
        vodUrl: row.vodUrl == null ? null : asString(row.vodUrl),
        status: asString(row.status) as "SCHEDULED" | "IN_PROGRESS" | "COMPLETED",
        sixManEntryHome: asBool(row.sixManEntryHome),
        sixManEntryAway: asBool(row.sixManEntryAway),
        createdAt: optionalDate(row.createdAt),
        updatedAt: optionalDate(row.updatedAt),
      },
    });
    matchIdMap.set(asString(row.id), created.id);
  }

  for (const row of sets) {
    const matchId = matchIdMap.get(asString(row.matchId));
    if (!matchId) continue;

    const created = await prisma.set.create({
      data: {
        matchId,
        orderIndex: asNumber(row.orderIndex),
        tierBracket: asString(row.tierBracket) as
          | "TIER_1_2"
          | "TIER_2_3"
          | "TIER_3_4"
          | "TIER_4_5"
          | "TIER_2"
          | "TIER_3"
          | "TIER_4"
          | "ACE",
        mapName: row.mapName == null ? null : asString(row.mapName),
      },
    });
    setIdMap.set(asString(row.id), created.id);
  }

  for (const row of setResults) {
    const setId = setIdMap.get(asString(row.setId));
    const winnerTeamId = teamIdMap.get(asString(row.winnerTeamId));
    const loserTeamId = teamIdMap.get(asString(row.loserTeamId));
    const winnerPlayerId = playerIdMap.get(asString(row.winnerPlayerId));
    const loserPlayerId = playerIdMap.get(asString(row.loserPlayerId));
    if (!setId || !winnerTeamId || !loserTeamId || !winnerPlayerId || !loserPlayerId) continue;

    await prisma.setResult.create({
      data: {
        setId,
        winnerTeamId,
        loserTeamId,
        winnerPlayerId,
        loserPlayerId,
        playedAt: asDate(row.playedAt) ?? new Date(),
      },
    });
  }

  for (const row of matchEntries) {
    const matchId = matchIdMap.get(asString(row.matchId));
    if (!matchId) continue;

    const created = await prisma.matchEntry.create({
      data: {
        matchId,
        homeConfirmedAt: asDate(row.homeConfirmedAt),
        awayConfirmedAt: asDate(row.awayConfirmedAt),
        publishedAt: asDate(row.publishedAt),
        homeConfirmedBy:
          row.homeConfirmedBy == null ? null : asString(row.homeConfirmedBy),
        awayConfirmedBy:
          row.awayConfirmedBy == null ? null : asString(row.awayConfirmedBy),
        createdAt: optionalDate(row.createdAt),
        updatedAt: optionalDate(row.updatedAt),
      },
    });
    entryIdMap.set(asString(row.id), created.id);
  }

  for (const row of entrySlots) {
    const entryId = entryIdMap.get(asString(row.entryId));
    const teamId = teamIdMap.get(asString(row.teamId));
    const setId = setIdMap.get(asString(row.setId));
    const playerId = playerIdMap.get(asString(row.playerId));
    if (!entryId || !teamId || !setId || !playerId) continue;

    await prisma.entrySlot.create({
      data: {
        entryId,
        teamId,
        setId,
        playerId,
      },
    });
  }

  sqlite.close();

  const neonResults = await prisma.setResult.count();
  const neonMatches = await prisma.match.count();

  console.log("Neon migration complete:", {
    matches: neonMatches,
    setResults: neonResults,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
