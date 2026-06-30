export const DEFAULT_ODDS = 2;

export type PredictionPool = {
  home: number;
  away: number;
  total: number;
};

export type PredictionOdds = {
  home: number;
  away: number;
};

export function computePredictionPools(
  predictions: { pickedTeamId: string; stake: number; status: string }[],
  homeTeamId: string,
  awayTeamId: string,
): PredictionPool {
  let home = 0;
  let away = 0;

  for (const prediction of predictions) {
    if (prediction.status !== "OPEN") {
      continue;
    }

    if (prediction.pickedTeamId === homeTeamId) {
      home += prediction.stake;
    } else if (prediction.pickedTeamId === awayTeamId) {
      away += prediction.stake;
    }
  }

  return { home, away, total: home + away };
}

export function computePredictionOdds(pool: PredictionPool): PredictionOdds {
  return {
    home: pool.home > 0 ? pool.total / pool.home : DEFAULT_ODDS,
    away: pool.away > 0 ? pool.total / pool.away : DEFAULT_ODDS,
  };
}

export function formatOdds(value: number): string {
  return `${value.toFixed(2)}배`;
}

export function estimatePayout(stake: number, odds: number): number {
  return Math.floor(stake * odds);
}

export function computeWinnerPayout(
  stake: number,
  winningSidePool: number,
  totalPool: number,
): number {
  if (winningSidePool <= 0) {
    return stake;
  }

  return Math.floor((stake / winningSidePool) * totalPool);
}
