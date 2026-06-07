"use client";

import {
  formatSeasonDisplayLabel,
  SEASON_COOKIE,
  sortSeasonsByNumber,
} from "@/lib/season-selection";
import { useRouter } from "next/navigation";

type SeasonOption = {
  slug: string;
};

export function SeasonSwitcher({
  seasons,
  selectedSlug,
}: {
  seasons: SeasonOption[];
  selectedSlug: string;
}) {
  const router = useRouter();
  const sorted = sortSeasonsByNumber(seasons);

  function handleChange(slug: string) {
    if (slug === selectedSlug) {
      return;
    }

    document.cookie = `${SEASON_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.refresh();
  }

  return (
    <label className="inline-flex items-center gap-1 text-sm text-[var(--muted)]">
      <span className="sr-only">시즌 선택</span>
      <select
        value={selectedSlug}
        onChange={(event) => handleChange(event.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-5 text-sm text-[var(--muted)] outline-none hover:text-[var(--foreground)]"
        aria-label="시즌 선택"
      >
        {sorted.map((season) => (
          <option key={season.slug} value={season.slug}>
            {formatSeasonDisplayLabel(season.slug)}
          </option>
        ))}
      </select>
      <span className="pointer-events-none -ml-4 text-xs text-[var(--muted)]" aria-hidden>
        ▼
      </span>
    </label>
  );
}
