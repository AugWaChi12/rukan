import { describe, expect, it } from 'vitest';
import { updateProfileSchema } from './profile';

describe('updateProfileSchema', () => {
  it('ตัดช่องว่างหน้า/หลังชื่อ', () => {
    expect(updateProfileSchema.parse({ display_name: '  Aug  ' }).display_name).toBe('Aug');
  });

  it('ไม่ยอมรับชื่อว่าง', () => {
    expect(updateProfileSchema.safeParse({ display_name: '   ' }).success).toBe(false);
  });

  it('ไม่ยอมรับชื่อเกิน 50 ตัวอักษร (ตรงกับ check constraint ใน DB)', () => {
    expect(updateProfileSchema.safeParse({ display_name: 'a'.repeat(51) }).success).toBe(false);
  });

  it('ไม่ยอมรับ bio เกิน 500 ตัวอักษร', () => {
    const result = updateProfileSchema.safeParse({ display_name: 'a', bio: 'b'.repeat(501) });
    expect(result.success).toBe(false);
  });
});
