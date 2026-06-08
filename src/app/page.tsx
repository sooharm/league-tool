import { DataTable } from "@/components/DataTable";
import { PageShell } from "@/components/PageShell";
import { getActiveSeason, getSeasonStandings } from "@/lib/data";

export default async function HomePage() {
  const season = await getActiveSeason();
  const standings = season ? await getSeasonStandings(season.id) : [];

  return (
    <PageShell
      title="팀 기본 순위"
      description="승점 → 승패 → 팀 승자승 기준으로 자동 계산됩니다."
    >
      <div className="mb-6 rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm text-[var(--muted)]">
        <p className="font-medium text-[var(--foreground)]">승점 산정</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>경기 승리 +3점</li>
          <li>6인 엔트리 +1점</li>
          <li>에결 패배팀 +1점</li>
          <li>6:0 완승 +1점</li>
        </ul>
      </div>

      <DataTable
        rows={standings}
        emptyMessage="활성 시즌이 없거나 경기 결과가 없습니다."
        columns={[
          {
            key: "rank",
            header: "순위",
            render: (row) => row.rank,
            className: "w-16",
          },
          {
            key: "team",
            header: "팀명",
            render: (row) => (
              <span className="font-medium" style={{ color: row.color }}>
                {row.teamName}
              </span>
            ),
          },
          { key: "games", header: "경기수", render: (row) => row.games, className: "w-20" },
          { key: "wins", header: "승", render: (row) => row.wins, className: "w-16" },
          { key: "losses", header: "패", render: (row) => row.losses, className: "w-16" },
          {
            key: "points",
            header: "승점",
            render: (row) => <span className="font-bold text-[var(--accent)]">{row.points}</span>,
            className: "w-20",
          },
        ]}
      />
    </PageShell>
  );
}
