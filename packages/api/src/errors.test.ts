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

  it('ไม่รู้จัก → unknown', () => {
    expect(toApiError({ message: 'boom', code: 'XX000' }).code).toBe('unknown');
  });
});
