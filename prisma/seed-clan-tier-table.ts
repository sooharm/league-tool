import { getBaseRp } from "@/features/elo/constants";
import { NAMU_CLAN_TIER_MEMBERS } from "@/lib/clan-tier-table-data";
import { prisma } from "@/lib/prisma";

async function main() {
  let created = 0;
  let updated = 0;

  const officialNicknames = new Set(NAMU_CLAN_TIER_MEMBERS.map((entry) => entry.nickname));

  await prisma.clanMember.updateMany({
    where: {
      OR: [{ tier: 0 }, { nickname: { notIn: [...officialNicknames] } }],
      isActive: true,
    },
    data: { isActive: false },
  });

  for (const entry of NAMU_CLAN_TIER_MEMBERS) {
    const existing = await prisma.clanMember.findUnique({
      where: { nickname: entry.nickname },
    });

    const data = {
      race: entry.race,
      tier: entry.tier,
      rp: getBaseRp(entry.tier),
      isActive: true,
    };

    if (existing) {
      await prisma.clanMember.update({
        where: { id: existing.id },
        data,
      });
      updated += 1;
      continue;
    }

    await prisma.clanMember.create({
      data: {
        nickname: entry.nickname,
        ...data,
      },
    });
    created += 1;
  }

  console.log(`클랜 명단 동기화 완료: 추가 ${created}명, 갱신 ${updated}명`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
