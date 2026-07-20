import { EloBoardTable } from "@/components/EloBoardTable";
import { EloPageShell } from "@/components/EloPageShell";
import { EloRecalculateButton } from "@/components/EloRecalculateButton";
import { getEloBoardRows } from "@/features/elo/board-data";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { getAuthContext } from "@/lib/permissions";
import { notFound } from "next/navigation";

export default async function EloBoardPage() {
  if (!isEloBoardEnabled()) {
    notFound();
  }

  const [rows, auth] = await Promise.all([getEloBoardRows(), getAuthContext()]);

  return (
    <EloPageShell
      title="랭킹보드"
      description="나무클랜 개인전 랭킹입니다. 랭킹전 결과입력 시 RP 반영되며, 개인리그/프로리그는 자동반영됩니다."
    >
      {auth?.isAdmin ? (
        <div className="mb-6">
          <EloRecalculateButton />
        </div>
      ) : null}
      <EloBoardTable rows={rows} />
    </EloPageShell>
  );
}
