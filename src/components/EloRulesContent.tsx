import type { ReactNode } from "react";
import {
  INDIVIDUAL_LEAGUE_PLACEMENT_BONUS_RP,
  MATCH_TYPE_WEIGHT,
} from "@/features/elo/constants";

function RulesTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
      <table className="min-w-full text-sm">
        <thead className="border-b border-[var(--card-border)] bg-[var(--background)]/50 text-left text-[var(--muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className="border-b border-[var(--card-border)] last:border-b-0"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-[var(--foreground)]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      {children}
    </section>
  );
}

function ExampleBox({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3">
      <p className="mb-2 font-medium text-[var(--foreground)]">{title}</p>
      <div className="space-y-1 text-[var(--muted)]">{children}</div>
    </div>
  );
}

const TIER_BASE_POINTS: [string, number][] = [
  ["1티어", 3000],
  ["2티어", 2500],
  ["3티어", 2000],
  ["4티어", 1500],
  ["5티어", 1000],
];

const MATCH_TYPE_WEIGHTS: [string, number][] = [
  ["랭킹전", MATCH_TYPE_WEIGHT.ranking],
  ["이벤트", MATCH_TYPE_WEIGHT.event],
  ["개인리그", MATCH_TYPE_WEIGHT.individual_integrated],
  ["프로리그", MATCH_TYPE_WEIGHT.pro_league],
];

const TOURNAMENT_BONUS: [string, number][] = [
  ["🥇 우승", INDIVIDUAL_LEAGUE_PLACEMENT_BONUS_RP.champion],
  ["🥈 준우승", INDIVIDUAL_LEAGUE_PLACEMENT_BONUS_RP.runnerUp],
  ["🥉 4강", INDIVIDUAL_LEAGUE_PLACEMENT_BONUS_RP.semifinal],
];

const TIER_WIN_WEIGHTS: [string, number, number][] = [
  ["동티어 승리", 0, 1.0],
  ["1티어차 승리", 1, 1.6],
  ["2티어차 승리", 2, 2.4],
  ["3티어차 승리", 3, 3.5],
  ["4티어차 승리", 4, 5.0],
  ["5티어차 승리", 5, 7.0],
  ["6티어차 승리", 6, 9.5],
];

const TIER_LOSS_WEIGHTS: [string, number, number][] = [
  ["동티어 패배", 0, 1.0],
  ["1티어차 패배", 1, 0.7],
  ["2티어차 패배", 2, 0.55],
  ["3티어차 패배", 3, 0.42],
  ["4티어차 패배", 4, 0.32],
  ["5티어차 패배", 5, 0.25],
  ["6티어차 패배", 6, 0.2],
];

const BASE_FLUCTUATION: [number, number][] = [
  [0, 25],
  [1, 24],
  [2, 23],
  [3, 22],
  [4, 21],
];

export function EloRulesContent() {
  return (
    <div className="space-y-8 text-sm leading-7 text-[var(--foreground)]">
      <Section title="산정 개요">
        <p className="text-[var(--muted)]">
          나무클랜 RP는 티어 기본점에서 시작해, 경기 결과에 따라 등락합니다. 한 판의
          등락폭은 <strong className="text-[var(--foreground)]">하위 티어 선수</strong>를
          기준으로 가중치를 정하고, 승·패 양쪽에 같은 절댓값이 적용됩니다. (0합)
        </p>
        <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
          <li>티어 숫자가 클수록 하위 티어입니다. (1티어 &gt; 2티어 &gt; … &gt; 5티어)</li>
          <li>기권 경기는 RP 변동이 없습니다.</li>
          <li>대회 종류에 따라 가중치가 곱해집니다.</li>
          <li>개인리그 최종 성적(우승·준우승·4강)에는 별도의 추가 RP가 있습니다.</li>
        </ul>
      </Section>

      <Section title="초기 티어 기본점">
        <p className="text-[var(--muted)]">
          RP 산정을 시작할 때, 클랜원은 공식 티어에 맞는 아래 기본점에서 출발합니다.
        </p>
        <RulesTable headers={["티어", "기본점"]} rows={TIER_BASE_POINTS} />
      </Section>

      <Section title="대회 가중치">
        <p className="text-[var(--muted)]">
          경기 종류마다 등락폭에 곱해지는 배율입니다. 같은 판이라도 프로리그에서 치른
          결과가 랭킹전보다 더 크게 반영됩니다.
        </p>
        <RulesTable headers={["경기 종류", "가중치"]} rows={MATCH_TYPE_WEIGHTS} />
      </Section>

      <Section title="개인리그 성적 추가 RP">
        <p className="text-[var(--muted)]">
          개인리그에서 최종 성적이 확정되면, 세트 승패와 별도로 아래 RP가 더해집니다.
        </p>
        <RulesTable headers={["성적", "추가 RP"]} rows={TOURNAMENT_BONUS} />
      </Section>

      <Section title="티어 가중치 (하위 티어 기준)">
        <p className="text-[var(--muted)]">
          두 선수의 티어 차이를 기준으로, <strong className="text-[var(--foreground)]">하위 티어 선수</strong>가
          이겼는지 졌는지에 따라 가중치를 선택합니다. 숫자가 클수록 변동폭이 커집니다.
        </p>
        <p className="text-[var(--muted)]">하위 티어 선수가 이긴 경우 (승리 가중치)</p>
        <RulesTable
          headers={["구분", "티어 차이", "가중치"]}
          rows={TIER_WIN_WEIGHTS.map(([label, diff, weight]) => [label, diff, weight])}
        />
        <p className="text-[var(--muted)]">하위 티어 선수가 진 경우 (패배 가중치)</p>
        <RulesTable
          headers={["구분", "티어 차이", "가중치"]}
          rows={TIER_LOSS_WEIGHTS.map(([label, diff, weight]) => [label, diff, weight])}
        />
      </Section>

      <Section title="RP 기본 등락점수">
        <p className="text-[var(--muted)]">
          두 선수의 티어 차이에 따른 기본 점수입니다. 이 값에 티어 가중치와 대회 가중치를
          곱해 최종 등락폭을 구합니다. 티어 차이가 4를 넘으면 4와 동일하게 21점을
          사용합니다.
        </p>
        <RulesTable
          headers={["티어 차이", "기본 등락점"]}
          rows={BASE_FLUCTUATION.map(([diff, points]) => [diff, points])}
        />
      </Section>

      <Section title="한 판 등락 계산">
        <ol className="list-decimal space-y-2 pl-5 text-[var(--muted)]">
          <li>두 선수 중 하위 티어(숫자가 큰 쪽)를 기준 선수로 정합니다.</li>
          <li>티어 차이로 기본 등락점을 찾습니다.</li>
          <li>
            기준 선수가 이겼으면 승리 가중치, 졌으면 패배 가중치를 곱합니다.
          </li>
          <li>경기 종류의 대회 가중치를 곱합니다.</li>
          <li>반올림한 값이 그 판의 등락폭입니다. 승자는 +, 패자는 −로 같은 절댓값이 적용됩니다.</li>
        </ol>
        <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-4 py-3 font-mono text-xs text-[var(--muted)] sm:text-sm">
          <p>등락폭 = round(기본 등락점 × 티어 가중치 × 대회 가중치)</p>
          <p>승자 RP += 등락폭</p>
          <p>패자 RP −= 등락폭</p>
        </div>
      </Section>

      <Section title="계산 예시">
        <p className="text-[var(--muted)]">
          아래 예시는 둘 다 티어 기본점에서 시작하고, 랭킹전(가중치 1.0) 한 판을 치른
          경우입니다. 2티어(2500점)와 3티어(2000점)의 대결입니다.
        </p>

        <ExampleBox title="예시 1 — 3티어가 2티어를 이김 (이변)">
          <p>하위 티어: 3티어(승) · 티어 차이 1 · 기본 등락점 24</p>
          <p>승리 가중치 1.6 적용 → 24 × 1.6 × 1.0 = 38.4 → 반올림 38</p>
          <p>
            <strong className="text-[var(--foreground)]">3티어 +38</strong> (2000 → 2038) ·{" "}
            <strong className="text-[var(--foreground)]">2티어 −38</strong> (2500 → 2462)
          </p>
        </ExampleBox>

        <ExampleBox title="예시 2 — 3티어가 2티어에게 짐 (정상 흐름)">
          <p>하위 티어: 3티어(패) · 티어 차이 1 · 기본 등락점 24</p>
          <p>패배 가중치 0.7 적용 → 24 × 0.7 × 1.0 = 16.8 → 반올림 17</p>
          <p>
            <strong className="text-[var(--foreground)]">3티어 −17</strong> (2000 → 1983) ·{" "}
            <strong className="text-[var(--foreground)]">2티어 +17</strong> (2500 → 2517)
          </p>
        </ExampleBox>

        <ExampleBox title="예시 3 — 같은 상황, 프로리그(가중치 1.7)">
          <p>예시 1과 동일하되 대회 가중치만 1.7 → 24 × 1.6 × 1.7 = 65.28 → 반올림 65</p>
          <p>
            <strong className="text-[var(--foreground)]">3티어 +65</strong> ·{" "}
            <strong className="text-[var(--foreground)]">2티어 −65</strong>
          </p>
        </ExampleBox>

        <p className="text-[var(--muted)]">
          아래 티어가 위 티어를 이기면 변동이 크고(승리 가중치 ↑), 아래 티어가 위 티어에게
          지면 변동이 작습니다(패배 가중치 ↓). 어느 쪽이든 한 판의 오름·내림 절댓값은
          항상 같습니다.
        </p>
      </Section>

      <Section title="반영 대상 경기">
        <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
          <li>랭킹전</li>
          <li>이벤트</li>
          <li>프로(팀)리그</li>
          <li>개인리그</li>
        </ul>
      </Section>

      <Section title="Ranking Board 표시 기준">
        <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
          <li>클랜원 명단에 등록된 활성 선수를 표시합니다.</li>
          <li>경기 기록이 없어도 티어 기본점으로 표시됩니다.</li>
        </ul>
      </Section>

      <Section title="리그툴 반영 현황">
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[var(--muted)]">
          프로리그 세트 결과 저장 시 위 규칙으로 RP가 자동 반영됩니다. 랭킹보드는 클랜원
          명단의 RP를 표시하며, 데이터 정합이 필요할 때 랭킹보드에서 전체 재동기화를 실행할 수
          있습니다.
        </p>
      </Section>
    </div>
  );
}
