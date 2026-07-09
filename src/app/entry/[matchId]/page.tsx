import { EntryForm } from "@/components/EntryForm";
import { PageShell } from "@/components/PageShell";
import { getMatchForEntry, getSeasonPlayoffMatches } from "@/lib/data";
import { getPlayoffRoundLabel } from "@/lib/playoff-bracket";
import { notFound } from "next/navigation";

export default async function EntryMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = await getMatchForEntry(matchId);

  if (!match) {
    notFound();
  }

  const title = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const playoffMatches = !match.countsTowardStandings
    ? await getSeasonPlayoffMatches(match.seasonId)
    : [];
  const playoffLabel = getPlayoffRoundLabel(match, playoffMatches);
  const description = playoffLabel
    ? `${playoffLabel} · ${title}`
    : `${match.week}주차 · ${title}`;

  return (
    <PageShell title="경기 엔트리" description={description}>
      <EntryForm matchId={matchId} />
    </PageShell>
  );
}
