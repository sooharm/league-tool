import { PageShell } from "@/components/PageShell";
import { PlayerStandingsTable } from "@/components/PlayerStandingsTable";
import { getSeason4Season, getSeasonPlayerStandings } from "@/lib/data";

export default async function PlayersPage() {
  const season = await getSeason4Season();
  const standings = season ? await getSeasonPlayerStandings(season.id) : [];

  return (
    <PageShell siteMode="season4"
      title="개인 순위"
      description="총경기수, 총전적, 승률을 확인하고 선수별 경기 기록을 조회합니다."
    >
      <PlayerStandingsTable rows={standings} />
    </PageShell>
  );
}

