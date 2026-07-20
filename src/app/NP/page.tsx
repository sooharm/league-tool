import { Season5PageShell } from "@/components/Season5PageShell";
import { WalletPointsLeaderboard } from "@/components/WalletPointsLeaderboard";
import { auth } from "@/auth";
import { DEV_STAFF_DISCORD_ID, isDevStaffBypassEnabled } from "@/lib/dev-auth";
import { getWalletPointsLeaderboard, WELCOME_POINTS } from "@/lib/points";
import {
  isSeason5Enabled,
  SEASON5_NP_BOARD_TITLE,
} from "@/lib/season5/config";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function NpBoardPage() {
  if (!isSeason5Enabled()) {
    notFound();
  }

  const viewerDiscordUserId = isDevStaffBypassEnabled()
    ? DEV_STAFF_DISCORD_ID
    : (await auth())?.user?.id ?? null;

  const leaderboard = await getWalletPointsLeaderboard(viewerDiscordUserId);
  const myEntry = leaderboard.find((row) => row.isMe);

  return (
    <Season5PageShell
      title={SEASON5_NP_BOARD_TITLE}
      description={`Discord 로그인 시 ${WELCOME_POINTS} NP가 지급됩니다. 승부예측·미니게임 등에서 획득·사용할 수 있습니다.`}
    >
      <div className="space-y-6">
        {viewerDiscordUserId ? (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm">
            <span className="text-[var(--muted)]">내 NP</span>{" "}
            <span className="text-lg font-bold tabular-nums text-[var(--accent)]">
              {myEntry?.points ?? 0} NP
            </span>
            {myEntry ? (
              <span className="ml-3 text-[var(--muted)]">순위 {myEntry.rank}위</span>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)]">
            Discord 로그인 후 내 NP와 순위가 표시됩니다.{" "}
            <Link href="/login" className="text-[var(--accent)] hover:underline">
              로그인
            </Link>
          </div>
        )}

        <WalletPointsLeaderboard
          rows={leaderboard}
          pointsColumnLabel="NP"
          pointsSuffix="NP"
          emptyMessage="아직 NP 기록이 없습니다. Discord 로그인 후 NP를 받아 보세요."
        />
      </div>
    </Season5PageShell>
  );
}
