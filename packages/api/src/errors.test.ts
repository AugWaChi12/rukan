import { describe, expect, it } from 'vitest';
import { toApiError } from './errors';

describe('toApiError', () => {
  it('ข้อความที่ RPC raise → code เดียวกัน พร้อม detail', () => {
    const e = toApiError({ message: 'verification_required', code: '42501', details: 'selfie' });
    expect(e.code).toBe('verification_required');
    expect(e.detail).toBe('selfie');
  });

  it('permission denied ทั่วไป → forbidden', () => {
    expect(
      toApiError({ message: 'permission denied for function get_my_status', code: '42501' }).code,
    ).toBe('forbidden');
  });

  it('fetch ล้ม → network', () => {
    expect(toApiError(new TypeError('Failed to fetch')).code).toBe('network');
  });

  it('ข้อความที่ RPC เฟส 2–5 raise (แม้มี errcode 42501) → แปลงเป็น code เฉพาะของเหตุการณ์นั้น', () => {
    expect(toApiError({ message: 'same_moderator_cannot_review_appeal', code: '42501' }).code).toBe(
      'same_moderator_cannot_review_appeal',
    );
    expect(toApiError({ message: 'candidate_not_in_deck', code: '42501' }).code).toBe(
      'candidate_not_in_deck',
    );
    const limit = toApiError({
      message: 'swipe_limit_reached',
      code: 'P0001',
      details: '2026-10-25T12:00:00+00:00',
    });
    expect(limit.code).toBe('swipe_limit_reached');
    expect(limit.detail).toBe('2026-10-25T12:00:00+00:00');
    expect(toApiError({ message: 'profile_not_accessible', code: '42501' }).code).toBe(
      'profile_not_accessible',
    );
    expect(toApiError({ message: 'contains_prohibited_contact', code: '22023' }).code).toBe(
      'contains_prohibited_contact',
    );
  });

  it('ไม่รู้จัก → unknown', () => {
    expect(toApiError({ message: 'boom', code: 'XX000' }).code).toBe('unknown');
  });
});
