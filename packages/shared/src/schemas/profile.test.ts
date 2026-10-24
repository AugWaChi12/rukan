import { describe, expect, it } from 'vitest';
import {
  ageFromBirthdate,
  interestsSchema,
  myStatusSchema,
  onboardingSchema,
  photoPositionSchema,
  promptAnswerSchema,
  updateProfileSchema,
} from './profile';

describe('ageFromBirthdate', () => {
  const today = new Date(2026, 9, 24); // 24 ต.ค. 2026

  it('นับอายุเต็มปี — ยังไม่ถึงวันเกิดปีนี้', () => {
    expect(ageFromBirthdate('2008-10-25', today)).toBe(17);
  });

  it('วันเกิดวันนี้ = ครบปีแล้ว', () => {
    expect(ageFromBirthdate('2008-10-24', today)).toBe(18);
  });
});

describe('onboardingSchema', () => {
  const valid = { displayName: ' มิว ', birthdate: '2000-01-01', modes: ['friend'] };

  it('ผ่านเมื่อข้อมูลครบ และตัดช่องว่างชื่อ', () => {
    expect(onboardingSchema.parse(valid).displayName).toBe('มิว');
  });

  it('อายุไม่ถึง 18 ไม่ผ่าน (ตรงกับ complete_onboarding ใน DB)', () => {
    const birthdate = `${new Date().getFullYear() - 17}-01-01`;
    expect(onboardingSchema.safeParse({ ...valid, birthdate }).success).toBe(false);
  });

  it('ต้องเลือกโหมดอย่างน้อย 1', () => {
    expect(onboardingSchema.safeParse({ ...valid, modes: [] }).success).toBe(false);
  });

  it('โหมดที่ไม่มีในระบบไม่ผ่าน', () => {
    expect(onboardingSchema.safeParse({ ...valid, modes: ['hookup'] }).success).toBe(false);
  });

  it('ชื่อยาวเกิน 50 ไม่ผ่าน', () => {
    expect(onboardingSchema.safeParse({ ...valid, displayName: 'a'.repeat(51) }).success).toBe(
      false,
    );
  });
});

describe('updateProfileSchema', () => {
  it('ทุกช่องไม่บังคับ', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it('bio เกิน 500 ไม่ผ่าน', () => {
    expect(updateProfileSchema.safeParse({ bio: 'b'.repeat(501) }).success).toBe(false);
  });
});

describe('myStatusSchema', () => {
  it('ไม่ยอมรับ next_step ที่ไม่รู้จัก', () => {
    const status = {
      user_id: '33333333-3333-4333-8333-333333333333',
      state: 'active',
      verification_level: 'none',
      onboarded: false,
      missing_consents: [],
      next_step: 'teleport',
    };
    expect(myStatusSchema.safeParse(status).success).toBe(false);
    expect(myStatusSchema.safeParse({ ...status, next_step: 'phone' }).success).toBe(true);
  });
});

describe('interestsSchema / promptAnswerSchema / photoPositionSchema', () => {
  it('ความสนใจเกิน 10 อย่างไม่ผ่าน', () => {
    const ten = Array.from({ length: 10 }, (_, i) => `tag_${i}`);
    expect(interestsSchema.safeParse(ten).success).toBe(true);
    expect(interestsSchema.safeParse([...ten, 'tag_10']).success).toBe(false);
  });

  it('คำตอบคำถามโปรไฟล์ยาวเกิน 200 ไม่ผ่าน แต่ค่าว่างผ่าน (ใช้ลบคำตอบ)', () => {
    expect(promptAnswerSchema.safeParse({ promptId: 'p1', answer: '' }).success).toBe(true);
    expect(promptAnswerSchema.safeParse({ promptId: 'p1', answer: 'a'.repeat(201) }).success).toBe(
      false,
    );
  });

  it('ตำแหน่งรูปต้องอยู่ระหว่าง 0–5', () => {
    expect(photoPositionSchema.safeParse(0).success).toBe(true);
    expect(photoPositionSchema.safeParse(5).success).toBe(true);
    expect(photoPositionSchema.safeParse(-1).success).toBe(false);
    expect(photoPositionSchema.safeParse(6).success).toBe(false);
  });
});
