import { PredictBoard } from "@/components/PredictBoard";
import { PageShell } from "@/components/PageShell";

export default function PredictPage() {
  return (
    <PageShell siteMode="season4" title="승부예측">
      <PredictBoard />
    </PageShell>
  );
}
