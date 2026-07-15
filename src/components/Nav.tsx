import { DiscordAuthButton } from "@/components/DiscordAuthButton";
import { SeasonSwitcher } from "@/components/SeasonSwitcher";
import { auth } from "@/auth";
import { isDevStaffBypassEnabled } from "@/lib/dev-auth";
import { SITE_TITLE } from "@/lib/season-selection";
import Link from "next/link";

const links = [
  { href: "/entry", label: "금일의 엔트리" },
  { href: "/predict", label: "승부예측" },
  { href: "/", label: "팀 순위" },
  { href: "/players", label: "개인 순위" },
  { href: "/schedule", label: "일정" },
  { href: "/results", label: "경기결과" },
  { href: "/db", label: "DB" },
  { href: "/roster", label: "로스터" },
  { href: "/rules", label: "규정집" },
];

type SeasonOption = {
  slug: string;
};

export async function Nav({
  seasons,
  selectedSeasonSlug,
}: {
  seasons: SeasonOption[];
  selectedSeasonSlug: string;
}) {
  const session = await auth();

  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-start gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {SITE_TITLE}
              </h1>
              <SeasonSwitcher seasons={seasons} selectedSlug={selectedSeasonSlug} />
            </div>
            <Link
              href="/playoff"
              className="group relative mt-0.5 inline-flex items-center overflow-hidden rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-400/25 via-amber-600/20 to-amber-900/40 px-5 py-2.5 text-lg font-black tracking-wide text-amber-50 shadow-[0_0_32px_rgba(251,191,36,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] transition hover:border-amber-200 hover:shadow-[0_0_48px_rgba(251,191,36,0.45)] sm:mt-1 sm:px-7 sm:py-3 sm:text-xl"
            >
              <span
                className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition group-hover:opacity-100"
                aria-hidden
              />
              <span className="relative">결승</span>
            </Link>
          </div>
          {isDevStaffBypassEnabled() ? (
            <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-200">
              로컬 운영진
            </span>
          ) : (
            <DiscordAuthButton session={session} />
          )}
        </div>
        <nav className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg border border-[var(--card-border)] px-3 py-1.5 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
