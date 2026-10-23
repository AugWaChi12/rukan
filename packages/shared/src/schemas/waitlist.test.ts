import { describe, expect, it } from 'vitest';
import { waitlistFormSchema } from './waitlist';

const valid = { email: ' Mango@Example.com ', area: 'อารีย์', consent: true as const };

describe('waitlistFormSchema', () => {
  it('ตัดช่องว่างและแปลงอีเมลเป็นตัวพิมพ์เล็ก', () => {
    expect(waitlistFormSchema.parse(valid).email).toBe('mango@example.com');
  });

  it('ไม่ยอมรับอีเมลผิดรูปแบบ', () => {
    expect(waitlistFormSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
  });

  it('ต้องติ๊กยินยอม', () => {
    expect(waitlistFormSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });

  it('ช่วงอายุต้องอยู่ในรายการเดียวกับ DB', () => {
    expect(waitlistFormSchema.safeParse({ ...valid, ageBand: '99-100' }).success).toBe(false);
    expect(waitlistFormSchema.parse({ ...valid, ageBand: '22-25' }).ageBand).toBe('22-25');
  });

  it('intents ว่างได้ ค่าเริ่มต้นเป็น []', () => {
    expect(waitlistFormSchema.parse(valid).intents).toEqual([]);
  });
});
