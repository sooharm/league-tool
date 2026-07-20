import { PageShell } from "@/components/PageShell";
import { RulesEditLink } from "@/components/RulesEditLink";
import { getSeason4Season } from "@/lib/data";
import { DEFAULT_RULES_TEXT } from "@/lib/default-rules";

export default async function RulesPage() {
  const season = await getSeason4Season();

  return (
    <PageShell siteMode="season4" title="???" description="?? ??? ?????">
      <div className="mb-4 flex justify-end">
        <RulesEditLink />
      </div>
      <article className="whitespace-pre-wrap rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-sm leading-7 text-[var(--foreground)]">
        {season?.rulesText ?? DEFAULT_RULES_TEXT}
      </article>
    </PageShell>
  );
}
