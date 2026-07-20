"use client";

import { SEASON_COOKIE } from "@/lib/season-selection";
import type { PastSeasonEntry } from "@/lib/past-seasons";
import { useRouter } from "next/navigation";

export function PastSeasonLink({
  season,
}: {
  season: PastSeasonEntry;
}) {
  const router = useRouter();

  function handleClick() {
    document.cookie = `${SEASON_COOKIE}=${encodeURIComponent(season.dbSlug)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.push(season.href);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-5 text-left text-base font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
    >
      {season.label}
    </button>
  );
}
