import { EloBoardTable } from "@/components/EloBoardTable";
import { EloPageShell } from "@/components/EloPageShell";
import { EloRecalculateButton } from "@/components/EloRecalculateButton";
import { getEloBoardRows } from "@/features/elo/board-data";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { notFound } from "next/navigation";

export default async function EloBoardPage() {
  if (!isEloBoardEnabled()) {
    notFound();
  }

  const rows = await getEloBoardRows();

  return (
    <EloPageShell
      title="랭킹보드"
      description="나무클랜 개인전 랭킹입니다. 랭킹전 결과입력 시 RP 반영되며, 개인리그/프로리그는 자동반영됩니다."
    >
      <div className="mb-6 space-y-4">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-medium">로컬 미리보기</p>
          <p className="mt-1 text-amber-100/80">
            배포 환경에서는 기본적으로 숨겨집니다. 제목 아래 ▼에서 Elo System과 리그 시즌을
            전환할 수 있습니다.
          </p>
        </div>
        <EloRecalculateButton />
      </div>
      <EloBoardTable rows={rows} />
    </EloPageShell>
  );
}
