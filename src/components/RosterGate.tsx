import { PageShell } from "@/components/PageShell";
import { canManageRoster, getAuthContext } from "@/lib/permissions";
import Link from "next/link";

export async function RosterGate({
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
          <p className="text-[var(--muted)]">
            로스터 관리는 Discord 로그인 후, 팀장·부팀장 또는 운영진만 이용할 수 있습니다.
          </p>
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

  if (!canManageRoster(auth)) {
    return (
      <PageShell title={title} description={description}>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">
            로스터에 연결된 팀장·부팀장 또는 운영진만 접근할 수 있습니다.
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
