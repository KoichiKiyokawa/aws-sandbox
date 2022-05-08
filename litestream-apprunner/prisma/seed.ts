import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  for (let i = 0; i < 10; i++) {
    await prisma.user.create({
      data: { name: `user${i}`, email: `user${i}@example.com` },
    });
  }
}

seed();
