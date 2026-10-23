import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { healthResponseSchema } from '@stumatch/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/app.setup.js';

// ต้องมี PostgreSQL รันอยู่ (pnpm db:up) และตั้ง DATABASE_URL ใน apps/api/.env
describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health → 200 และ database up', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    const body = healthResponseSchema.parse(res.body);
    expect(body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('route ที่ไม่มี → 404 ตามรูปแบบ ApiError', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);

    expect(res.body).toMatchObject({ statusCode: 404, error: expect.any(String) });
  });
});
