// ข้อมูลทดสอบสำหรับ dev — รันด้วย `pnpm db:seed`
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import argon2 from 'argon2';
import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }),
});

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@stumatch.dev' },
    update: {},
    create: {
      email: 'demo@stumatch.dev',
      displayName: 'Demo User',
      passwordHash: await argon2.hash('password123'),
    },
  });
  console.log(`Seeded user: ${user.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
