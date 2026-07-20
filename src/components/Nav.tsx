import { ChampionshipNavLink } from "@/components/ChampionshipNavLink";
import { DiscordAuthButton } from "@/components/DiscordAuthButton";
import { SiteModeSwitcher } from "@/components/SiteModeSwitcher";
import { auth } from "@/auth";
import { isDevStaffBypassEnabled } from "@/lib/dev-auth";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { isSeason5Enabled } from "@/lib/season5/config";
import {
  INDIVIDUAL_ROUTES,
  NP_ROUTES,
  PRO_ROUTES,
  RP_ROUTES,
  SEASON4_ROUTES,
} from "@/lib/site-routes";
import { SITE_TITLE } from "@/lib/season-selection";
import Link from "next/link";

const leagueLinks = [
  { href: PRO_ROUTES.entry, label: "금일의 엔트리" },
  { href: PRO_ROUTES.predict, label: "승부예측" },
  { href: PRO_ROUTES.root, label: "팀 순위" },
  { href: PRO_ROUTES.players, label: "개인 순위" },
  { href: PRO_ROUTES.schedule, label: "일정" },
  { href: PRO_ROUTES.results, label: "경기결과" },
  { href: PRO_ROUTES.roster, label: "로스터" },
  { href: PRO_ROUTES.rules, label: "규정집" },
  { href: PRO_ROUTES.pastSeasons, label: "과거시즌" },
];

const season4Links = [
  { href: SEASON4_ROUTES.entry, label: "금일의 엔트리" },
  { href: SEASON4_ROUTES.predict, label: "승부예측" },
  { href: SEASON4_ROUTES.root, label: "팀 순위" },
  { href: SEASON4_ROUTES.players, label: "개인 순위" },
  { href: SEASON4_ROUTES.schedule, label: "일정" },
  { href: SEASON4_ROUTES.results, label: "경기결과" },
  { href: SEASON4_ROUTES.roster, label: "로스터" },
  { href: SEASON4_ROUTES.rules, label: "규정집" },
];

const eloLinks = [
  { href: RP_ROUTES.root, label: "랭킹보드" },
  { href: RP_ROUTES.players, label: "개인성적조회" },
  { href: RP_ROUTES.results, label: "경기결과입력" },
  { href: RP_ROUTES.rules, label: "RP 기준" },
  { href: RP_ROUTES.tiers, label: "클랜원 명단" },
];

const season5Links = [
  { href: NP_ROUTES.root, label: "NP보드" },
  { href: NP_ROUTES.minigame, label: "미니게임" },
];

const individualLinks = [{ href: INDIVIDUAL_ROUTES.root, label: "개인리그" }];

export async function Nav({
  siteMode = "league",
}: {
  siteMode?: "league" | "elo" | "season5" | "individual" | "season4";
}) {
  const session = await auth();
  const links =
    siteMode === "elo"
      ? eloLinks
      : siteMode === "season5"
        ? season5Links
        : siteMode === "individual"
          ? individualLinks
          : siteMode === "season4"
            ? season4Links
            : leagueLinks;
  const eloBoardEnabled = isEloBoardEnabled();
  const season5Enabled = isSeason5Enabled();
  const showPlayoffTab = siteMode === "season4";

  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card)]">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-start gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                {SITE_TITLE}
              </h1>
              <SiteModeSwitcher
                siteMode={siteMode}
                eloBoardEnabled={eloBoardEnabled}
                season5Enabled={season5Enabled}
              />
            </div>
            {showPlayoffTab ? <ChampionshipNavLink /> : null}
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
