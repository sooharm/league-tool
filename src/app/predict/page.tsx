import { PageShell } from "@/components/PageShell";
import Link from "next/link";

export default function PredictPage() {
  return (
    <PageShell
      title="승부예측"
      description="경기 결과를 예측하고 포인트를 획득하는 기능입니다."
    >
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center">
        <p className="text-lg font-medium text-[var(--foreground)]">준비 중입니다</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          승부예측 기능은 곧 오픈됩니다. Discord 로그인 시 최초 1회 100포인트가 지급됩니다.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-[var(--accent)] transition hover:underline"
        >
          로그인 후 포인트 확인 →
        </Link>
      </div>
    </PageShell>
  );
}
