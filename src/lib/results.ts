import type { MatchStatus } from "@prisma/client";

export const FORFEIT_PLAYER_VALUE = "__FORFEIT__";

export function isForfeitPlayerValue(playerId: string | null | undefined) {
  return playerId === FORFEIT_PLAYER_VALUE;
}

export type SetResultInput = {
  setId: string;
  mapName?: string;
  homePlayerId?: string;
  awayPlayerId?: string;
  winnerSide?: "home" | "away";
};

export type ResultInputStatus = "empty" | "partial" | "complete";

export function getResultInputStatus(match: {
  sets: { result: unknown }[];
}): ResultInputStatus {
  const total = match.sets.length;
  const filled = match.sets.filter((set) => set.result).length;

  if (filled === 0) return "empty";
  if (filled === total) return "complete";
  return "partial";
}

export function getResultInputStatusLabel(status: ResultInputStatus) {
  if (status === "complete") return "입력 완료";
  if (status === "partial") return "부분 입력";
  return "미입력";
}

export function resolveMatchStatusAfterSave(
  totalSets: number,
  savedCount: number,
): MatchStatus {
  if (savedCount === 0) return "SCHEDULED";
  if (savedCount === totalSets) return "COMPLETED";
  return "IN_PROGRESS";
}
