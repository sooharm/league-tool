import { EloPageShell } from "@/components/EloPageShell";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { canManageRoster, getAuthContext } from "@/lib/permissions";
import { SEASON4_ROUTES } from "@/lib/site-routes";
import Link from "next/link";
import { notFound } from "next/navigation";

const PLANNED_SOURCES = [
  { label: "랭킹전", status: "준비중" },
  { label: "이벤트경기", status: "준비중" },
  { label: "개인리그(통합)", status: "준비중" },
  { label: "개인리그(티어)", status: "준비중" },
];

export default async function EloResultsPage() {
  if (!isEloBoardEnabled()) {
    notFound();
  }

  const auth = await getAuthContext();
  const isStaff = canManageRoster(auth);

  return (
    <EloPageShell
      title="경기결과입력"
      description="RP에 반영할 경기 결과를 입력합니다. 프로리그는 리그 경기결과 탭에서 관리합니다."
    >
      {!auth ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">
            결과 입력은 Discord 로그인 후, 운영진만 이용할 수 있습니다.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg border border-[#5865f2]/60 bg-[#5865f2]/15 px-4 py-2 text-sm font-medium text-[#c7d2fe]"
          >
            Discord 로그인
          </Link>
        </div>
      ) : !isStaff ? (
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">운영진만 결과를 입력할 수 있습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <p className="font-medium">입력 폼 준비 중</p>
            <p className="mt-1 text-amber-100/80">
              프로리그 세트 결과는 리그 「경기결과」에서 저장하면 RP에 자동 반영됩니다. 아래
              유형은 추후 이 탭에서 수기 입력할 예정입니다.
            </p>
          </div>

          <section className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <h3 className="text-base font-semibold">입력 예정 경기 유형</h3>
            </div>
            <ul className="divide-y divide-[var(--card-border)]/60">
              {PLANNED_SOURCES.map((source) => (
                <li
                  key={source.label}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span>{source.label}</span>
                  <span className="text-[var(--muted)]">{source.status}</span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-sm text-[var(--muted)]">
            프로리그 결과는{" "}
            <Link href={SEASON4_ROUTES.results} className="text-[var(--accent)] hover:underline">
              리그 경기결과
            </Link>
            에서 저장하면 RP에 자동 반영됩니다. 데이터 정합이 필요할 때만 랭킹보드에서 전체
            재동기화를 실행하세요.
          </p>
        </div>
      )}
    </EloPageShell>
  );
}
