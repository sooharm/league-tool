import { SeasonCookieSetter } from "@/components/SeasonCookieSetter";
import { DEFAULT_PRO_LEAGUE_SEASON_SLUG } from "@/lib/season-selection";

export default function Season4Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SeasonCookieSetter seasonSlug={DEFAULT_PRO_LEAGUE_SEASON_SLUG} />
      {children}
    </>
  );
}
