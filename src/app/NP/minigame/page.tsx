import { Season5PageShell } from "@/components/Season5PageShell";
import {
  isSeason5Enabled,
  SEASON5_MINIGAME_TITLE,
} from "@/lib/season5/config";
import { notFound } from "next/navigation";

export default async function Season5Page() {
  if (!isSeason5Enabled()) {
    notFound();
  }

  return (
    <Season5PageShell title={SEASON5_MINIGAME_TITLE}>
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-6 py-12 text-center">
        <p className="text-lg font-medium text-[var(--foreground)]">준비 중</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          로그인 시, 플레이가능하며 하루에 3회 도전가능합니다
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          가장 먼저 클리어하는 사람에게는 포인트 혜택이 주어집니다.
        </p>
      </div>
    </Season5PageShell>
  );
}
