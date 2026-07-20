import type { ClanMemberRow } from "@/lib/clan-member-api";

const tierColors: Record<number, string> = {
  1: "bg-yellow-500/20 text-yellow-200",
  2: "bg-red-500/20 text-red-200",
  3: "bg-pink-500/20 text-pink-200",
  4: "bg-blue-500/20 text-blue-200",
  5: "bg-green-500/20 text-green-200",
};

const raceLabels: Record<string, string> = {
  P: "프로토스",
  T: "테란",
  Z: "저그",
};

export function ClanTierRoster({ members }: { members: ClanMemberRow[] }) {
  if (members.length === 0) {
    return (
      <p className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center text-[var(--muted)]">
        등록된 클랜원이 없습니다.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5].map((tier) => {
        const tierMembers = members.filter((member) => member.tier === tier);
        if (tierMembers.length === 0) return null;

        return (
          <section
            key={tier}
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card)]"
          >
            <div className="border-b border-[var(--card-border)] px-4 py-3">
              <span className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${tierColors[tier]}`}>
                {tier}티어
              </span>
              <span className="ml-2 text-sm text-[var(--muted)]">{tierMembers.length}명</span>
            </div>
            <ul className="divide-y divide-[var(--card-border)]/60">
              {tierMembers.map((member) => (
                <li key={member.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="font-medium text-[var(--foreground)]">{member.nickname}</span>
                  <span className="text-[var(--muted)]">
                    {raceLabels[member.race] ?? member.race}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
