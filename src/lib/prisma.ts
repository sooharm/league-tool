import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

function isPrismaConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("Closed") ||
    message.includes("Connection terminated") ||
    message.includes("Can't reach database server")
  );
}

/** Neon 등에서 idle 연결이 끊긴 뒤 dev 서버가 멈춘 것처럼 보일 때 복구 */
export async function ensurePrismaConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error;
    }

    await prisma.$disconnect().catch(() => undefined);
    await prisma.$connect();
  }
}
