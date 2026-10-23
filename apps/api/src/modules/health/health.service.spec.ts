import { healthResponseSchema } from '@stumatch/shared';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

function createService(queryRaw: () => Promise<unknown>) {
  return new HealthService({ $queryRaw: queryRaw } as unknown as PrismaService);
}

describe('HealthService', () => {
  it('ตอบ ok เมื่อ database ใช้งานได้', async () => {
    const result = await createService(() => Promise.resolve([1])).check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(healthResponseSchema.safeParse(result).success).toBe(true);
  });

  it('ตอบ error เมื่อ database ใช้งานไม่ได้', async () => {
    const result = await createService(() => Promise.reject(new Error('down'))).check();

    expect(result.status).toBe('error');
    expect(result.database).toBe('down');
  });
});
