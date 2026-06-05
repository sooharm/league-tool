import type { MatchForMapStats } from "@/lib/map-stats";
import { MAP_OPTIONS } from "@/lib/maps";
import type { Race } from "@prisma/client";

export type RaceMatrixCell = {
  wins: number;
  losses: number;
  winRate: number | null;
};

export type RaceMatrixStats = {
  matrix: Record<Race, Record<Race, RaceMatrixCell>>;
  totalSets: number;
};

export const RACE_MATRIX_ORDER: Race[] = ["Z", "P", "T"];

export const RACE_MATRIX_LABELS: Record<Race, string> = {
  Z: "저그",
  P: "프로토스",
  T: "테란",
};

export const RACE_MATRIX_COLUMN_LABELS: Record<Race, string> = {
  Z: "저그전",
  P: "프로토스전",
  T: "테란전",
};

function createEmptyMatrix() {
  const matrix = {} as Record<Race, Record<Race, RaceMatrixCell>>;

  for (const rowRace of RACE_MATRIX_ORDER) {
    matrix[rowRace] = {} as Record<Race, RaceMatrixCell>;

    for (const colRace of RACE_MATRIX_ORDER) {
      matrix[rowRace][colRace] = { wins: 0, losses: 0, winRate: null };
    }
  }

  return matrix;
}

function toWinRate(wins: number, total: number) {
  if (total === 0) return null;
  return Math.round((wins / total) * 1000) / 10;
}

export function calculateRaceMatrixStats(
  matches: MatchForMapStats[],
  mapName?: string,
): RaceMatrixStats {
  const matrix = createEmptyMatrix();
  let totalSets = 0;
  const mapFilter = mapName?.trim();

  for (const match of matches) {
    for (const set of match.sets) {
      const result = set.result;
      if (!result) continue;

      const setMapName = set.mapName?.trim();
      if (mapFilter && setMapName !== mapFilter) continue;

      const winnerRace = result.winnerPlayer.race;
      const loserRace = result.loserPlayer.race;

      if (winnerRace === loserRace) continue;

      totalSets += 1;
      matrix[winnerRace][loserRace].wins += 1;
      matrix[loserRace][winnerRace].losses += 1;
    }
  }

  for (const rowRace of RACE_MATRIX_ORDER) {
    for (const colRace of RACE_MATRIX_ORDER) {
      if (rowRace === colRace) continue;

      const cell = matrix[rowRace][colRace];
      const total = cell.wins + cell.losses;
      cell.winRate = toWinRate(cell.wins, total);
    }
  }

  return { matrix, totalSets };
}

export type DbStatsPayload = {
  overall: RaceMatrixStats;
  byMap: Record<string, RaceMatrixStats>;
};

export function buildDbStatsPayload(matches: MatchForMapStats[]): DbStatsPayload {
  return {
    overall: calculateRaceMatrixStats(matches),
    byMap: Object.fromEntries(
      MAP_OPTIONS.map((mapName) => [mapName, calculateRaceMatrixStats(matches, mapName)]),
    ),
  };
}

export function formatRaceMatrixCell(cell: RaceMatrixCell) {
  const total = cell.wins + cell.losses;
  if (total === 0) return "-";

  const rate = cell.winRate === null ? "-" : `${cell.winRate.toFixed(1)}%`;
  return `${cell.wins}승 ${cell.losses}패(${rate})`;
}
