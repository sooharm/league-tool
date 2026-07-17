import { PageShell } from "@/components/PageShell";
import { PlayoffBracket } from "@/components/PlayoffBracket";
import { getActiveSeason, getSeasonMatches } from "@/lib/data";
import { buildFinalsBracketView } from "@/lib/playoff-bracket";

export default async function PlayoffPage() {
  const season = await getActiveSeason();
  const matches = season ? await getSeasonMatches(season.id) : [];
  const bracket = buildFinalsBracketView(matches);

  return (
    <PageShell
      title={bracket.isComplete ? "우승" : "결승"}
      description={
        bracket.isComplete && bracket.champion?.kind === "team"
          ? `${bracket.champion.name} 시즌 우승을 축하합니다!`
          : "시즌 결승전 — 목·금 1·2차전 대진입니다."
      }
    >
      <PlayoffBracket bracket={bracket} />
    </PageShell>
  );
}
