import { EloPageShell } from "@/components/EloPageShell";
import { canManageRoster, getAuthContext } from "@/lib/permissions";
import Link from "next/link";
import type { ReactNode } from "react";

export async function ClanTierRosterGate({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const auth = await getAuthContext();

  if (!auth) {
    return (
      <EloPageShell title={title} description={description}>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">
            명단 관리는 Discord 로그인 후, 운영진만 이용할 수 있습니다.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block rounded-lg border border-[#5865f2]/60 bg-[#5865f2]/15 px-4 py-2 text-sm font-medium text-[#c7d2fe]"
          >
            Discord 로그인
          </Link>
        </div>
      </EloPageShell>
    );
  }

  if (!canManageRoster(auth)) {
    return (
      <EloPageShell title={title} description={description}>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
          <p className="text-[var(--muted)]">운영진만 접근할 수 있습니다.</p>
        </div>
      </EloPageShell>
    );
  }

  return (
    <EloPageShell title={title} description={description}>
      {children}
    </EloPageShell>
  );
}
