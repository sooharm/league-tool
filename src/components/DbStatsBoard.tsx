"use client";

import { RaceMatrixBoard } from "@/components/RaceMatrixBoard";
import { MAP_OPTIONS } from "@/lib/maps";
import type { DbStatsPayload } from "@/lib/race-matrix-stats";
import { useState } from "react";

export function DbStatsBoard({ data }: { data: DbStatsPayload }) {
  const [selectedMap, setSelectedMap] = useState<string | null>(null);

  const selectedStats = selectedMap ? data.byMap[selectedMap] : null;

  return (
    <div className="space-y-8">
      <RaceMatrixBoard stats={data.overall} />

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">맵별 통계</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">맵을 선택하면 해당 맵의 종족별 상대 승률이 표시됩니다.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {MAP_OPTIONS.map((mapName) => {
            const isSelected = selectedMap === mapName;
            const setCount = data.byMap[mapName]?.totalSets ?? 0;

            return (
              <button
                key={mapName}
                type="button"
                onClick={() => setSelectedMap((prev) => (prev === mapName ? null : mapName))}
                className={`rounded-lg border px-3 py-2 text-sm transition ${
                  isSelected
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 font-semibold text-[var(--accent)]"
                    : "border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                }`}
              >
                {mapName}
                <span className="ml-1.5 text-xs text-[var(--muted)]">({setCount})</span>
              </button>
            );
          })}
        </div>

        {selectedMap && selectedStats ? (
          <RaceMatrixBoard
            stats={selectedStats}
            title={`[${selectedMap} · 종족별 상대 승률]`}
            emptyMessage={`${selectedMap} 맵에 집계된 세트 결과가 없습니다.`}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">맵 버튼을 클릭해 맵별 통계를 확인하세요.</p>
        )}
      </section>
    </div>
  );
}
