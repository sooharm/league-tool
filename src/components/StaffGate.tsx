import { PageShell } from "@/components/PageShell";
import { getAuthContext } from "@/lib/permissions";
import Link from "next/link";

export async function StaffGate({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const auth = await getAuthContext();

  if (!auth) {
    return (
      <PageShell title={title} description={description}>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">운영진 전용 메뉴입니다. Discord로 로그인해 주세요.</p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg border border-[#5865f2]/60 bg-[#5865f2]/15 px-4 py-2 text-sm font-medium text-[#c7d2fe]"
          >
            Discord 로그인
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!auth.isStaff) {
    return (
      <PageShell title={title} description={description}>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">
            클랜마스터·클랜부마스터·리그운영자만 접근할 수 있습니다.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            운영진 Discord 역할이 연결되지 않았다면 관리자에게 문의하세요.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={title} description={description}>
      {children}
    </PageShell>
  );
}
