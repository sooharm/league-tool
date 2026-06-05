import { EntryForm } from "@/components/EntryForm";
import { PageShell } from "@/components/PageShell";
import { getMatchForEntry } from "@/lib/data";
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

  return (
    <PageShell
      title="경기 엔트리"
      description={`${match.week}주차 · ${title}`}
    >
      <EntryForm matchId={matchId} />
    </PageShell>
  );
}
