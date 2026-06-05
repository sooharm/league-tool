import { PageShell } from "@/components/PageShell";
import { PlayerStandingsTable } from "@/components/PlayerStandingsTable";
import { getActiveSeason, getSeasonPlayerStandings } from "@/lib/data";

export default async function PlayersPage() {
  const season = await getActiveSeason();
  const standings = season ? await getSeasonPlayerStandings(season.id) : [];

  return (
    <PageShell
      title="개인 순위"
      description="종족 상대 전적, 총경기수, 총전적, 승률을 검색·필터와 함께 확인합니다."
    >
      <PlayerStandingsTable rows={standings} />
    </PageShell>
  );
}

