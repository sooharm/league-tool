import { ClanTierRosterGate } from "@/components/ClanTierRosterGate";
import { ClanTierRosterManager } from "@/components/ClanTierRosterManager";
import { getActiveClanMembers } from "@/lib/clan-member-api";
import { isEloBoardEnabled } from "@/lib/elo-board/config";
import { notFound } from "next/navigation";

export default async function EloTiersManagePage() {
  if (!isEloBoardEnabled()) {
    notFound();
  }

  const members = await getActiveClanMembers();

  return (
    <ClanTierRosterGate
      title="클랜원 명단 관리"
      description="클랜 공식 티어 명단 등록 · 수정"
    >
      <ClanTierRosterManager initialMembers={members} />
    </ClanTierRosterGate>
  );
}
