import { buildStandardSets as buildSets, STANDARD_SET_BRACKETS } from "@/lib/tier-brackets";

export { STANDARD_SET_BRACKETS };

export type MatchScheduleSeed = {
  week: number;
  round: number;
  date: string;
  homeTeam: string;
  awayTeam: string;
};

/** 1~4주차 일정 (화·목) */
export const SEASON_MATCH_SCHEDULE: MatchScheduleSeed[] = [
  { week: 1, round: 1, date: "2026-05-12", homeTeam: "언제나상한가", awayTeam: "피나무라" },
  { week: 1, round: 1, date: "2026-05-14", homeTeam: "에스트로겐", awayTeam: "블로우잡" },
  { week: 2, round: 1, date: "2026-05-19", homeTeam: "피나무라", awayTeam: "에스트로겐" },
  { week: 2, round: 1, date: "2026-05-21", homeTeam: "언제나상한가", awayTeam: "블로우잡" },
  { week: 3, round: 1, date: "2026-05-26", homeTeam: "피나무라", awayTeam: "블로우잡" },
  { week: 3, round: 1, date: "2026-05-28", homeTeam: "언제나상한가", awayTeam: "에스트로겐" },
  { week: 4, round: 2, date: "2026-06-02", homeTeam: "언제나상한가", awayTeam: "피나무라" },
  { week: 4, round: 2, date: "2026-06-04", homeTeam: "에스트로겐", awayTeam: "블로우잡" },
];

export function buildStandardSets() {
  return buildSets();
}
