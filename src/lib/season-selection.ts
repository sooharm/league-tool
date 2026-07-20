export const SEASON_COOKIE = "seasonSlug";

export const SITE_TITLE = "스타크래프트 리그 Tool";
export const LEAGUE_PREFIX = "나무클랜 프로(팀)리그";

export const PRO_LEAGUE_OPTION_VALUE = "__pro_league__";
export const PRO_LEAGUE_LABEL = "팀/프로리그";
export const DEFAULT_PRO_LEAGUE_SEASON_SLUG = "season-4";

export const INDIVIDUAL_LEAGUE_OPTION_VALUE = "__individual_league__";
export const INDIVIDUAL_LEAGUE_LABEL = "개인리그";
export const INDIVIDUAL_LEAGUE_SEASON_SLUG = "individual-league";

export function seasonNumberFromSlug(slug: string) {
  const match = slug.match(/season-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export function formatSeasonDisplayLabel(slug: string) {
  const number = seasonNumberFromSlug(slug);
  return number > 0 ? `${LEAGUE_PREFIX} 시즌${number}` : LEAGUE_PREFIX;
}

export function sortSeasonsByNumber<T extends { slug: string }>(seasons: T[]) {
  return [...seasons].sort(
    (a, b) => seasonNumberFromSlug(b.slug) - seasonNumberFromSlug(a.slug),
  );
}
