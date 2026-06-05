import {
  formatRaceMatrixCell,
  RACE_MATRIX_COLUMN_LABELS,
  RACE_MATRIX_LABELS,
  RACE_MATRIX_ORDER,
  type RaceMatrixStats,
} from "@/lib/race-matrix-stats";

export function RaceMatrixBoard({
  stats,
  title = "[종족별 상대 승률]",
  emptyMessage = "아직 집계할 세트 결과가 없습니다.",
}: {
  stats: RaceMatrixStats;
  title?: string;
  emptyMessage?: string;
}) {
  if (stats.totalSets === 0) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-8 text-center text-[var(--muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <section className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)]">
      <div className="border-b border-[var(--card-border)] px-4 py-3">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">총 {stats.totalSets}세트 기준</p>
      </div>

      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-black/20 text-[var(--muted)]">
            <th className="whitespace-nowrap px-4 py-3 text-left font-medium">종족</th>
            {RACE_MATRIX_ORDER.map((race) => (
              <th key={race} className="whitespace-nowrap px-4 py-3 text-center font-medium">
                {RACE_MATRIX_COLUMN_LABELS[race]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RACE_MATRIX_ORDER.map((rowRace) => (
            <tr
              key={rowRace}
              className="border-b border-[var(--card-border)]/60 last:border-b-0 hover:bg-white/5"
            >
              <td className="whitespace-nowrap px-4 py-3 font-medium text-[var(--foreground)]">
                {RACE_MATRIX_LABELS[rowRace]}
              </td>
              {RACE_MATRIX_ORDER.map((colRace) => (
                <td key={colRace} className="whitespace-nowrap px-4 py-3 text-center">
                  {rowRace === colRace
                    ? "-"
                    : formatRaceMatrixCell(stats.matrix[rowRace][colRace])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
