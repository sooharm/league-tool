import { DbStatsBoard } from "@/components/DbStatsBoard";
import { PageShell } from "@/components/PageShell";
import { getActiveSeason, getSeasonDbStats } from "@/lib/data";

export default async function DbPage() {
  const season = await getActiveSeason();
  const stats = season ? await getSeasonDbStats(season.id) : null;

  return (
    <PageShell
      title="DB"
      description="전체·맵별 종족 상대 승률 매트릭스를 확인합니다."
    >
      {stats ? (
        <DbStatsBoard data={stats} />
      ) : (
        <p className="text-[var(--muted)]">활성 시즌이 없습니다.</p>
      )}
    </PageShell>
  );
}
