import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    include: { homeTeam: true, awayTeam: true, sets: true },
    orderBy: [{ week: "asc" }, { scheduledAt: "asc" }],
  });

  for (const match of matches) {
    const hasResults = match.sets.some((set) =>
      prisma.setResult ? false : false,
    );
    console.log(
      `${match.week}w ${match.round}R`,
      match.homeTeam.name,
      "vs",
      match.awayTeam.name,
      `sets:${match.sets.length}`,
      match.id,
    );
  }

  console.log("total:", matches.length);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
