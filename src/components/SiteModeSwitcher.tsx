"use client";

import {
  ELO_BOARD_LABEL,
  ELO_BOARD_OPTION_VALUE,
} from "@/lib/elo-board/config";
import {
  SEASON5_LABEL,
  SEASON5_OPTION_VALUE,
} from "@/lib/season5/config";
import {
  INDIVIDUAL_LEAGUE_OPTION_VALUE,
  PRO_LEAGUE_OPTION_VALUE,
  SEASON_COOKIE,
} from "@/lib/season-selection";
import {
  INDIVIDUAL_ROUTES,
  isIndividualPath,
  isNpPath,
  isRpPath,
  isSeason4Path,
  NP_ROUTES,
  PRO_ROUTES,
  RP_ROUTES,
} from "@/lib/site-routes";
import { usePathname, useRouter } from "next/navigation";

export function SiteModeSwitcher({
  siteMode,
  eloBoardEnabled,
  season5Enabled,
}: {
  siteMode: "league" | "elo" | "season5" | "individual" | "season4";
  eloBoardEnabled: boolean;
  season5Enabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const currentValue =
    siteMode === "elo" || isRpPath(pathname)
      ? ELO_BOARD_OPTION_VALUE
      : siteMode === "season5" || isNpPath(pathname)
        ? SEASON5_OPTION_VALUE
        : siteMode === "individual" || isIndividualPath(pathname)
          ? INDIVIDUAL_LEAGUE_OPTION_VALUE
          : PRO_LEAGUE_OPTION_VALUE;

  function handleChange(value: string) {
    if (value === ELO_BOARD_OPTION_VALUE) {
      router.push(RP_ROUTES.root);
      return;
    }

    if (value === SEASON5_OPTION_VALUE) {
      router.push(NP_ROUTES.root);
      return;
    }

    if (value === INDIVIDUAL_LEAGUE_OPTION_VALUE) {
      router.push(INDIVIDUAL_ROUTES.root);
      return;
    }

    if (value === PRO_LEAGUE_OPTION_VALUE) {
      if (isRpPath(pathname) || isNpPath(pathname) || isIndividualPath(pathname)) {
        router.push(PRO_ROUTES.root);
        return;
      }

      if (isSeason4Path(pathname)) {
        router.push(PRO_ROUTES.root);
        return;
      }

      router.refresh();
    }
  }

  return (
    <label className="inline-flex items-center gap-1 text-sm text-[var(--muted)]">
      <span className="sr-only">리그 모드 선택</span>
      <select
        value={currentValue}
        onChange={(event) => handleChange(event.target.value)}
        className="max-w-[min(100vw-2rem,20rem)] cursor-pointer appearance-none truncate bg-transparent pr-5 text-sm text-[var(--muted)] outline-none hover:text-[var(--foreground)]"
        aria-label="리그 모드 선택"
      >
        {eloBoardEnabled ? (
          <option value={ELO_BOARD_OPTION_VALUE}>{ELO_BOARD_LABEL}</option>
        ) : null}
        {season5Enabled ? (
          <option value={SEASON5_OPTION_VALUE}>{SEASON5_LABEL}</option>
        ) : null}
        <option value={PRO_LEAGUE_OPTION_VALUE}>팀/프로리그</option>
        <option value={INDIVIDUAL_LEAGUE_OPTION_VALUE}>개인리그</option>
      </select>
      <span className="pointer-events-none -ml-4 text-xs text-[var(--muted)]" aria-hidden>
        ▼
      </span>
    </label>
  );
}
