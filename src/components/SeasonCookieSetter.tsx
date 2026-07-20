"use client";

import { useEffect } from "react";
import { SEASON_COOKIE } from "@/lib/season-selection";

export function SeasonCookieSetter({ seasonSlug }: { seasonSlug: string }) {
  useEffect(() => {
    document.cookie = `${SEASON_COOKIE}=${encodeURIComponent(seasonSlug)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }, [seasonSlug]);

  return null;
}
