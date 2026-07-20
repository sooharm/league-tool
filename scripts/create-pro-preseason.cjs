const fs = require("fs");
const path = require("path");

const proRoot = path.join("src", "app", "Pro");

const preseasonPage = `import { PreseasonPlaceholder } from "@/components/PreseasonPlaceholder";
import { PreseasonShell } from "@/components/PreseasonShell";

export default function PreseasonPage() {
  return (
    <PreseasonShell>
      <PreseasonPlaceholder />
    </PreseasonShell>
  );
}
`;

const pastSeasonsPage = `import { PastSeasonLink } from "@/components/PastSeasonLink";
import { PreseasonShell } from "@/components/PreseasonShell";
import { PAST_SEASONS } from "@/lib/past-seasons";

export default function PastSeasonsPage() {
  return (
    <PreseasonShell>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">과거시즌</h2>
        <p className="text-sm text-[var(--muted)]">이전 시즌 기록을 확인할 수 있습니다.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PAST_SEASONS.map((season) => (
            <PastSeasonLink key={season.id} season={season} />
          ))}
        </div>
      </div>
    </PreseasonShell>
  );
}
`;

const routes = [
  "page.tsx",
  "entry/page.tsx",
  "entry/[matchId]/page.tsx",
  "predict/page.tsx",
  "players/page.tsx",
  "schedule/page.tsx",
  "schedule/manage/page.tsx",
  "results/page.tsx",
  "results/[matchId]/page.tsx",
  "roster/page.tsx",
  "roster/manage/page.tsx",
  "rules/page.tsx",
  "rules/manage/page.tsx",
  "playoff/page.tsx",
];

fs.rmSync(proRoot, { recursive: true, force: true });
fs.mkdirSync(proRoot, { recursive: true });

for (const route of routes) {
  const filePath = path.join(proRoot, route);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, preseasonPage, "utf8");
}

const pastPath = path.join(proRoot, "past-seasons", "page.tsx");
fs.mkdirSync(path.dirname(pastPath), { recursive: true });
fs.writeFileSync(pastPath, pastSeasonsPage, "utf8");

console.log("Pro preseason pages created");
