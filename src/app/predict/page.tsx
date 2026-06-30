import { PredictBoard } from "@/components/PredictBoard";
import { PageShell } from "@/components/PageShell";

export default function PredictPage() {
  return (
    <PageShell
      title="승부예측"
      description="엔트리 공개(19:00) 이후 당일 경기 6세트별로 승리 선수에 포인트를 배팅하고, 세트 결과 입력 시 정산됩니다."
    >
      <PredictBoard />
    </PageShell>
  );
}
