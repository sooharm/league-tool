import { getSelectedSeason, getSeasonMatches } from "@/lib/data";
import { buildFinalsBracketView } from "@/lib/playoff-bracket";
import Link from "next/link";

export async function ChampionshipNavLink() {
  const season = await getSelectedSeason();
  const matches = season ? await getSeasonMatches(season.id) : [];
  const bracket = buildFinalsBracketView(matches);
  const isChampion = bracket.isComplete && bracket.champion != null;
  const championName = bracket.champion?.kind === "team" ? bracket.champion.name : null;
  const championColor =
    bracket.champion?.kind === "team" ? bracket.champion.color : "#fbbf24";
  const label = championName ? `${championName} 우승` : "결승";

  return (
    <Link
      href="/playoff"
      className={`group relative mt-0.5 inline-flex items-center gap-2 overflow-hidden rounded-2xl border-2 px-5 py-2.5 text-lg font-black tracking-wide transition sm:mt-1 sm:px-7 sm:py-3 sm:text-xl ${
        isChampion
          ? "border-yellow-200/95 bg-gradient-to-br from-yellow-300/35 via-amber-400/30 to-orange-600/45 text-yellow-50 shadow-[0_0_40px_rgba(251,191,36,0.55),0_0_80px_rgba(251,146,60,0.25)] hover:border-yellow-100 hover:shadow-[0_0_56px_rgba(251,191,36,0.7)]"
          : "border-amber-300/90 bg-gradient-to-br from-amber-400/25 via-amber-600/20 to-amber-900/40 text-amber-50 shadow-[0_0_32px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:border-amber-200 hover:shadow-[0_0_48px_rgba(251,191,36,0.45)]"
      }`}
    >
      {isChampion ? (
        <>
          <span
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(255,215,0,0.18),transparent_40%)]"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-yellow-200/30 blur-md"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -right-4 top-1/3 h-6 w-6 rounded-full bg-orange-300/25 blur-md"
            aria-hidden
          />
        </>
      ) : (
        <span
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
      )}
      {isChampion ? (
        <span className="relative text-xl sm:text-2xl" aria-hidden>
          🏆
        </span>
      ) : null}
      <span
        className="relative"
        style={isChampion ? { color: championColor, textShadow: `0 0 24px ${championColor}88` } : undefined}
      >
        {label}
      </span>
    </Link>
  );
}
