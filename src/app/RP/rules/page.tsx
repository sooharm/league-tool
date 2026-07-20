import { EloPageShell } from "@/components/EloPageShell";
import { EloRulesContent } from "@/components/EloRulesContent";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { notFound } from "next/navigation";

export default function EloRulesPage() {
  if (!isEloBoardEnabled()) {
    notFound();
  }

  return (
    <EloPageShell
      title="RP 기준"
      description="나무클랜 공식 RP 산정 기준입니다."
    >
      <EloRulesContent />
    </EloPageShell>
  );
}
