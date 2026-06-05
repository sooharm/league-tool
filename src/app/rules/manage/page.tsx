import { StaffGate } from "@/components/StaffGate";
import { RulesEditor } from "@/components/RulesEditor";
import { DEFAULT_RULES_TEXT } from "@/lib/default-rules";
import { getActiveSeason } from "@/lib/data";

export default async function RulesManagePage() {
  const season = await getActiveSeason();

  if (!season) {
    return (
      <StaffGate title="규정집 수정">
        <p className="text-[var(--muted)]">활성 시즌이 없습니다.</p>
      </StaffGate>
    );
  }

  return (
    <StaffGate title="규정집 수정" description="시즌별 규정 문구를 직접 편집합니다.">
      <RulesEditor
        initialData={{
          seasonId: season.id,
          seasonName: season.name,
          rulesText: season.rulesText ?? DEFAULT_RULES_TEXT,
        }}
      />
    </StaffGate>
  );
}
