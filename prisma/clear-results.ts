import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const deleted = await prisma.setResult.deleteMany();
  const updated = await prisma.match.updateMany({
    where: { status: { in: ["COMPLETED", "IN_PROGRESS"] } },
    data: { status: "SCHEDULED" },
  });

  console.log(`Deleted ${deleted.count} set results, reset ${updated.count} matches to SCHEDULED`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
