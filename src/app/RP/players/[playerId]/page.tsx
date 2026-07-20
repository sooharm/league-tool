import { EloPageShell } from "@/components/EloPageShell";
import { EloPlayerStatsDashboard } from "@/components/EloPlayerStatsDashboard";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ playerId: string }>;
};

export default async function EloPlayerPage({ params }: PageProps) {
  if (!isEloBoardEnabled()) {
    notFound();
  }

  const { playerId } = await params;

  return (
    <EloPageShell
      title="개인성적조회"
      description="선수를 선택하면 종족·리그·맵·연승·상대전적을 한눈에 확인할 수 있습니다."
    >
      <EloPlayerStatsDashboard initialPlayerId={playerId} />
    </EloPageShell>
  );
}
