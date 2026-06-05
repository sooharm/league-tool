export const MAP_OPTIONS = [
  "폴리포이드",
  "폴스타",
  "녹아웃",
  "에티튜드",
  "네오실피드",
  "매치포인트",
  "옥타곤",
] as const;

export type MapName = (typeof MAP_OPTIONS)[number];

export function isMapName(value: string): value is MapName {
  return (MAP_OPTIONS as readonly string[]).includes(value);
}
