export const RP_ROUTES = {
  root: "/RP",
  players: "/RP/players",
  results: "/RP/results",
  rules: "/RP/rules",
  tiers: "/RP/tiers",
  tiersManage: "/RP/tiers/manage",
  player: (playerId: string) => `/RP/players/${playerId}`,
} as const;

export const NP_ROUTES = {
  root: "/NP",
  minigame: "/NP/minigame",
} as const;

/** 프리시즌 팀/프로리그 */
export const PRO_ROUTES = {
  root: "/Pro",
  entry: "/Pro/entry",
  predict: "/Pro/predict",
  players: "/Pro/players",
  schedule: "/Pro/schedule",
  scheduleManage: "/Pro/schedule/manage",
  results: "/Pro/results",
  roster: "/Pro/roster",
  rosterManage: "/Pro/roster/manage",
  rules: "/Pro/rules",
  rulesManage: "/Pro/rules/manage",
  playoff: "/Pro/playoff",
  pastSeasons: "/Pro/past-seasons",
} as const;

/** 시즌4 프로리그 (실제 데이터) */
export const SEASON4_ROUTES = {
  root: "/season4",
  entry: "/season4/entry",
  entryMatch: (matchId: string) => `/season4/entry/${matchId}`,
  predict: "/season4/predict",
  players: "/season4/players",
  schedule: "/season4/schedule",
  scheduleManage: "/season4/schedule/manage",
  results: "/season4/results",
  resultsMatch: (matchId: string) => `/season4/results/${matchId}`,
  roster: "/season4/roster",
  rosterManage: "/season4/roster/manage",
  rules: "/season4/rules",
  rulesManage: "/season4/rules/manage",
  playoff: "/season4/playoff",
} as const;

export const INDIVIDUAL_ROUTES = {
  root: "/Individual",
} as const;

export function isRpPath(pathname: string) {
  return pathname === RP_ROUTES.root || pathname.startsWith(`${RP_ROUTES.root}/`);
}

export function isNpPath(pathname: string) {
  return pathname === NP_ROUTES.root || pathname.startsWith(`${NP_ROUTES.root}/`);
}

export function isIndividualPath(pathname: string) {
  const normalized = pathname.toLowerCase();
  return normalized === "/individual" || normalized.startsWith("/individual/");
}

export function isProPath(pathname: string) {
  return pathname === PRO_ROUTES.root || pathname.startsWith(`${PRO_ROUTES.root}/`);
}

export function isSeason4Path(pathname: string) {
  return pathname === SEASON4_ROUTES.root || pathname.startsWith(`${SEASON4_ROUTES.root}/`);
}

export function isProLeaguePath(pathname: string) {
  return isProPath(pathname) || isSeason4Path(pathname);
}
