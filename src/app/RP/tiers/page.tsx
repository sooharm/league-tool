import { ClanTierRoster } from "@/components/ClanTierRoster";
import { EloPageShell } from "@/components/EloPageShell";
import { getActiveClanMembers } from "@/lib/clan-member-api";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { canManageRoster, getAuthContext } from "@/lib/permissions";
import { RP_ROUTES } from "@/lib/site-routes";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EloTiersPage() {
  if (!isEloBoardEnabled()) {
    notFound();
  }

  const [members, auth] = await Promise.all([getActiveClanMembers(), getAuthContext()]);

  return (
    <EloPageShell
      title="클랜원 명단"
      description={`클랜 공식 티어 기준 명단 · ${members.length}명`}
    >
      {canManageRoster(auth) ? (
        <div className="mb-6">
          <Link
            href={RP_ROUTES.tiersManage}
            className="inline-block rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            명단 관리 →
          </Link>
        </div>
      ) : null}
      <ClanTierRoster members={members} />
    </EloPageShell>
  );
}
