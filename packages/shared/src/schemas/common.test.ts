import { describe, expect, it } from 'vitest';
import { paginationQuerySchema, toRange } from './common';

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

describe('toRange', () => {
  it('หน้าแรกเริ่มที่ index 0', () => {
    expect(toRange({ page: 1, limit: 20 })).toEqual({ from: 0, to: 19 });
  });

  it('หน้าถัดไปต่อจากหน้าก่อน', () => {
    expect(toRange({ page: 3, limit: 10 })).toEqual({ from: 20, to: 29 });
  });
});
