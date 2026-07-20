export type RpMatchType =
  | "ranking"
  | "event"
  | "pro_league"
  | "individual_integrated"
  | "individual_tier";

export const MATCH_TYPE_WEIGHT: Record<RpMatchType, number> = {
  ranking: 1.0,
  event: 1.0,
  pro_league: 1.7,
  individual_integrated: 1.5,
  individual_tier: 1.5,
};

/** 개인리그 최종 성적 추가 RP */
export const INDIVIDUAL_LEAGUE_PLACEMENT_BONUS_RP = {
  champion: 200,
  runnerUp: 100,
  semifinal: 50,
} as const;

/** 나무클랜 공식 티어 기본 RP */
export const TIER_BASE_RP: Record<number, number> = {
  1: 3000,
  2: 2500,
  3: 2000,
  4: 1500,
  5: 1000,
};

const TIER_WIN_WEIGHTS: Record<number, number> = {
  0: 1.0,
  1: 1.6,
  2: 2.4,
  3: 3.5,
  4: 5.0,
  5: 7.0,
  6: 9.5,
};

const TIER_LOSS_WEIGHTS: Record<number, number> = {
  0: 1.0,
  1: 0.7,
  2: 0.55,
  3: 0.42,
  4: 0.32,
  5: 0.25,
  6: 0.2,
};

const BASE_FLUCTUATION_BY_TIER_DIFF: Record<number, number> = {
  0: 25,
  1: 24,
  2: 23,
  3: 22,
  4: 21,
};

export function getBaseRp(tier: number): number {
  return TIER_BASE_RP[tier] ?? 1000;
}

/** @deprecated use getBaseRp */
export const TIER_BASE_ELO = TIER_BASE_RP;
/** @deprecated use getBaseRp */
export function getBaseElo(tier: number): number {
  return getBaseRp(tier);
}

function getBaseFluctuation(tierDiff: number): number {
  const clamped = Math.min(Math.max(tierDiff, 0), 4);
  return BASE_FLUCTUATION_BY_TIER_DIFF[clamped] ?? 21;
}

function getTierWeight(winnerTier: number, loserTier: number): number {
  const lowerTier = Math.max(winnerTier, loserTier);
  const higherTier = Math.min(winnerTier, loserTier);
  const tierDiff = Math.min(lowerTier - higherTier, 6);
  const lowerTierWon = winnerTier === lowerTier;

  if (lowerTierWon) {
    return TIER_WIN_WEIGHTS[tierDiff] ?? TIER_WIN_WEIGHTS[6];
  }

  return TIER_LOSS_WEIGHTS[tierDiff] ?? TIER_LOSS_WEIGHTS[6];
}

export type RpDeltas = {
  winnerDelta: number;
  loserDelta: number;
};

/** 하위 티어 기준, 0합 RP 등락 */
export function computeRpDeltas(
  winnerTier: number,
  loserTier: number,
  matchType: RpMatchType = "pro_league",
): RpDeltas {
  const lowerTier = Math.max(winnerTier, loserTier);
  const higherTier = Math.min(winnerTier, loserTier);
  const tierDiff = lowerTier - higherTier;
  const base = getBaseFluctuation(tierDiff);
  const tierWeight = getTierWeight(winnerTier, loserTier);
  const matchWeight = MATCH_TYPE_WEIGHT[matchType];
  const magnitude = Math.round(base * tierWeight * matchWeight);

  return {
    winnerDelta: magnitude,
    loserDelta: -magnitude,
  };
}
