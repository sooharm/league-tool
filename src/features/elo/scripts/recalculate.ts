import { recalculateAllElosFromLeagueResults } from "@/features/elo/calculator";

async function main() {
  const count = await recalculateAllElosFromLeagueResults();
  console.log(`RP recalculated for ${count} clan members (${count} players in snapshot).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
