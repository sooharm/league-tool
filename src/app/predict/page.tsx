import { PredictBoard } from "@/components/PredictBoard";
import { PageShell } from "@/components/PageShell";

export default function PredictPage() {
  return (
    <PageShell
      title="승부예측"
      description="엔트리 공개(19:00) 이후 당일 경기에 포인트를 배팅하고, 경기 종료 후 정산됩니다."
    >
      <PredictBoard />
    </PageShell>
  );
}
