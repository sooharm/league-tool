import { recalculateAllElos } from "../src/lib/elo";

async function main() {
  console.log("Starting Elo initialization from historical matches...");
  await recalculateAllElos();
  console.log("Elo initialization completed successfully.");
}

main()
  .catch((error) => {
    console.error("Error running Elo initialization:", error);
    process.exit(1);
  });
