import { PageShell } from "@/components/PageShell";
import { PlayoffBracket } from "@/components/PlayoffBracket";
import { getActiveSeason, getSeasonPlayoffMatches } from "@/lib/data";
import { buildPlayoffBracketView } from "@/lib/playoff-bracket";

export default async function PlayoffPage() {
  const season = await getActiveSeason();
  const matches = season ? await getSeasonPlayoffMatches(season.id) : [];
  const bracket = buildPlayoffBracketView(matches);

  return (
    <PageShell title="플레이오프" description="정규리그 종료 후 플레이오프 대진입니다.">
      <PlayoffBracket bracket={bracket} />
    </PageShell>
  );
}
