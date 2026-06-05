import { syncMatchSixManFromResults } from "../src/lib/entry-api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    select: { id: true },
  });

  for (const match of matches) {
    await syncMatchSixManFromResults(match.id);
  }

  console.log(`Synced six-man flags for ${matches.length} matches`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
