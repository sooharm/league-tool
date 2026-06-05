import { PrismaClient } from "@prisma/client";
import { DEFAULT_RULES_TEXT } from "../src/lib/default-rules";

const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  if (!season) {
    console.log("활성 시즌이 없습니다.");
    return;
  }

  await prisma.season.update({
    where: { id: season.id },
    data: { rulesText: DEFAULT_RULES_TEXT },
  });

  console.log(`규정 업데이트 완료: ${season.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
