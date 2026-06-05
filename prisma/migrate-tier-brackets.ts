import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "Set" SET tierBracket = 'TIER_2' WHERE tierBracket = 'TIER_SINGLE'`,
  );
  console.log(`Migrated TIER_SINGLE -> TIER_2 (${updated} rows)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
