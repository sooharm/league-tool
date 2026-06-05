import { PageShell } from "@/components/PageShell";
import { ResultForm } from "@/components/ResultForm";
import { getMatchForEntry } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function ResultInputPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const match = await getMatchForEntry(matchId);

  if (!match) {
    notFound();
  }

  if (match.sets.length === 0) {
    notFound();
  }

  return (
    <PageShell
      title="경기결과 입력"
      description={`${match.week}주차 · ${match.homeTeam.name} vs ${match.awayTeam.name}`}
    >
      <ResultForm matchId={matchId} />
    </PageShell>
  );
}
