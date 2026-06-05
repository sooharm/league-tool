import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deletedSlots = await prisma.entrySlot.deleteMany();
  const deletedEntries = await prisma.matchEntry.deleteMany();
  const updatedMatches = await prisma.match.updateMany({
    data: {
      sixManEntryHome: false,
      sixManEntryAway: false,
    },
  });

  console.log(
    `Cleared ${deletedSlots.count} entry slots, ${deletedEntries.count} match entries; reset six-man flags on ${updatedMatches.count} matches`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
