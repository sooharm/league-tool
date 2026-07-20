import { SEASON4_ROUTES } from "@/lib/site-routes";
import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { getSeason4Season } from "@/lib/data";
import { canManageRoster, getAuthContext } from "@/lib/permissions";
import { roleLabel } from "@/lib/roster";

const tierColors: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-200",
  2: "bg-red-500/20 text-red-200",
  3: "bg-pink-500/20 text-pink-200",
  4: "bg-blue-500/20 text-blue-200",
  5: "bg-green-500/20 text-green-200",
};

export default async function RosterPage() {
  const season = await getSeason4Season();
  const auth = await getAuthContext();

  if (!season) {
    return (
      <PageShell siteMode="season4" title="로스터">
        <p className="text-[var(--muted)]">활성 시즌이 없습니다.</p>
      </PageShell>
    );
  }

  return (
    <PageShell siteMode="season4" title="로스터" description={`${season.teams.length}개 팀 · 티어별 선수 목록`}>
      {canManageRoster(auth) ? (
        <div className="mb-6">
          <Link
            href={SEASON4_ROUTES.rosterManage}
            className="inline-block rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            로스터 관리 →
          </Link>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {season.teams.map((team) => (
          <section
            key={team.id}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          >
            <div
              className="border-b border-[var(--card-border)] px-4 py-3 font-bold"
              style={{ color: team.color }}
            >
              {team.name}
            </div>
            <div className="divide-y divide-[var(--card-border)]/60">
              {[1, 2, 3, 4, 5].map((tier) => {
                const players = team.players.filter((player) => player.tier === tier);
                if (players.length === 0) return null;

                return (
                  <div key={tier} className="px-4 py-3">
                    <p className={`mb-2 inline-block rounded px-2 py-0.5 text-xs ${tierColors[tier]}`}>
                      {tier}티어
                    </p>
                    <ul className="space-y-1 text-sm">
                      {players.map((player) => (
                        <li key={player.id}>
                          <span className={player.role !== "MEMBER" ? "text-red-300" : ""}>
                            {player.nickname}({player.race}
                            {roleLabel(player.role) ? `, ${roleLabel(player.role)}` : ""})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
