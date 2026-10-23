import { describe, expect, it } from 'vitest';
import { apiErrorSchema, paginationQuerySchema } from './common';

describe('paginationQuerySchema', () => {
  it('ใส่ค่า default เมื่อไม่ส่ง page/limit', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('แปลง query string เป็นตัวเลข', () => {
    expect(paginationQuerySchema.parse({ page: '2', limit: '50' })).toEqual({ page: 2, limit: 50 });
  });

  it('ไม่ยอมให้ limit เกิน 100', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('apiErrorSchema', () => {
  it('ใส่ details เป็น array ว่างเมื่อไม่ส่งมา', () => {
    const parsed = apiErrorSchema.parse({ statusCode: 404, error: 'Not Found', message: 'x' });
    expect(parsed.details).toEqual([]);
  });
});
