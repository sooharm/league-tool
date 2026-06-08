import { MAP_OPTIONS } from "@/lib/maps";
import type { Player, Set, SetResult } from "@prisma/client";
import type { Race } from "@prisma/client";

export type SetResultWithPlayers = SetResult & {
  winnerPlayer: Pick<Player, "race">;
  loserPlayer: Pick<Player, "race"> | null;
};

export type MatchForMapStats = {
  sets: (Set & { result: SetResultWithPlayers | null })[];
};

export type MatchupKey = "PvZ" | "TvP" | "ZvT";

export type MatchupStats = {
  key: MatchupKey;
  label: string;
  firstRace: Race;
  secondRace: Race;
  firstRaceLabel: string;
  secondRaceLabel: string;
  total: number;
  firstWins: number;
  secondWins: number;
  firstWinRate: number | null;
  secondWinRate: number | null;
};

export type MapMatchupCell = MatchupStats | null;

export type MapStatsRow = {
  mapName: string;
  total: number;
  matchups: Record<MatchupKey, MapMatchupCell>;
};

export type MapStatsSummary = {
  overall: Record<MatchupKey, MatchupStats>;
  byMap: MapStatsRow[];
  totalSets: number;
};

const RACE_LABELS: Record<Race, string> = {
  P: "프로토스",
  T: "테란",
  Z: "저그",
};

const MATCHUP_DEFS: Record<
  MatchupKey,
  { firstRace: Race; secondRace: Race; label: string }
> = {
  PvZ: { firstRace: "P", secondRace: "Z", label: "PvZ" },
  TvP: { firstRace: "T", secondRace: "P", label: "TvP" },
  ZvT: { firstRace: "Z", secondRace: "T", label: "ZvT" },
};

const MATCHUP_KEYS: MatchupKey[] = ["PvZ", "TvP", "ZvT"];

function createEmptyBucket() {
  return {
    PvZ: { firstWins: 0, secondWins: 0 },
    TvP: { firstWins: 0, secondWins: 0 },
    ZvT: { firstWins: 0, secondWins: 0 },
  };
}

function getMatchupKey(winnerRace: Race, loserRace: Race): MatchupKey | null {
  const pair = new Set([winnerRace, loserRace]);

  if (pair.has("P") && pair.has("Z")) return "PvZ";
  if (pair.has("T") && pair.has("P")) return "TvP";
  if (pair.has("Z") && pair.has("T")) return "ZvT";

  return null;
}

function toWinRate(wins: number, total: number) {
  if (total === 0) return null;
  return Math.round((wins / total) * 1000) / 10;
}

function toMatchupStats(
  key: MatchupKey,
  bucket: { firstWins: number; secondWins: number },
): MatchupStats {
  const def = MATCHUP_DEFS[key];
  const total = bucket.firstWins + bucket.secondWins;

  return {
    key,
    label: def.label,
    firstRace: def.firstRace,
    secondRace: def.secondRace,
    firstRaceLabel: RACE_LABELS[def.firstRace],
    secondRaceLabel: RACE_LABELS[def.secondRace],
    total,
    firstWins: bucket.firstWins,
    secondWins: bucket.secondWins,
    firstWinRate: toWinRate(bucket.firstWins, total),
    secondWinRate: toWinRate(bucket.secondWins, total),
  };
}

function recordResult(
  buckets: ReturnType<typeof createEmptyBucket>,
  winnerRace: Race,
  loserRace: Race,
) {
  const key = getMatchupKey(winnerRace, loserRace);
  if (!key) return;

  const def = MATCHUP_DEFS[key];
  if (winnerRace === def.firstRace) {
    buckets[key].firstWins += 1;
  } else {
    buckets[key].secondWins += 1;
  }
}

export function calculateMapStats(matches: MatchForMapStats[]): MapStatsSummary {
  const overallBuckets = createEmptyBucket();
  const mapBuckets = new Map<string, ReturnType<typeof createEmptyBucket>>();
  let totalSets = 0;

  for (const match of matches) {
    for (const set of match.sets) {
      const result = set.result;
      if (!result || result.isForfeit || !result.loserPlayer) continue;

      const winnerRace = result.winnerPlayer.race;
      const loserRace = result.loserPlayer.race;
      const mapName = set.mapName?.trim() || "(맵 미입력)";

      totalSets += 1;
      recordResult(overallBuckets, winnerRace, loserRace);

      if (!mapBuckets.has(mapName)) {
        mapBuckets.set(mapName, createEmptyBucket());
      }

      recordResult(mapBuckets.get(mapName)!, winnerRace, loserRace);
    }
  }

  const overall = Object.fromEntries(
    MATCHUP_KEYS.map((key) => [key, toMatchupStats(key, overallBuckets[key])]),
  ) as Record<MatchupKey, MatchupStats>;

  const knownMaps = [...MAP_OPTIONS];
  const extraMaps = [...mapBuckets.keys()]
    .filter((mapName) => !knownMaps.includes(mapName as (typeof MAP_OPTIONS)[number]))
    .sort((a, b) => a.localeCompare(b, "ko"));

  const orderedMapNames = [...knownMaps, ...extraMaps].filter((mapName) =>
    mapBuckets.has(mapName),
  );

  const byMap: MapStatsRow[] = orderedMapNames.map((mapName) => {
    const buckets = mapBuckets.get(mapName)!;

    return {
      mapName,
      total: MATCHUP_KEYS.reduce(
        (sum, key) => sum + buckets[key].firstWins + buckets[key].secondWins,
        0,
      ),
      matchups: Object.fromEntries(
        MATCHUP_KEYS.map((key) => {
          const stats = toMatchupStats(key, buckets[key]);
          return [key, stats.total > 0 ? stats : null];
        }),
      ) as Record<MatchupKey, MapMatchupCell>,
    };
  });

  return { overall, byMap, totalSets };
}

export function formatWinRate(rate: number | null) {
  if (rate === null) return "-";
  return `${rate.toFixed(1)}%`;
}
