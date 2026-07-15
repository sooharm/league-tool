import { PageShell } from "@/components/PageShell";
import { PlayoffBracket } from "@/components/PlayoffBracket";
import { getActiveSeason, getSeasonPlayoffMatches } from "@/lib/data";
import { buildFinalsBracketView } from "@/lib/playoff-bracket";

export default async function PlayoffPage() {
  const season = await getActiveSeason();
  const matches = season ? await getSeasonPlayoffMatches(season.id) : [];
  const bracket = buildFinalsBracketView(matches);

  return (
    <PageShell title="결승" description="시즌 결승전 — 목·금 1·2차전 대진입니다.">
      <PlayoffBracket bracket={bracket} />
    </PageShell>
  );
}
