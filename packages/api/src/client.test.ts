import type { RukanSupabaseClient } from './client';
import { describe, expect, it, vi } from 'vitest';
import { createApi } from './client';
import { ApiError } from './errors';

/** client ปลอมที่จำว่าถูกเรียก rpc อะไรด้วย args อะไร */
function fakeClient(rpcResult: { data: unknown; error: unknown }) {
  const rpc = vi.fn().mockResolvedValue(rpcResult);
  return { client: { rpc } as unknown as RukanSupabaseClient, rpc };
}

const status = {
  user_id: '33333333-3333-3333-3333-333333333333',
  state: 'active',
  verification_level: 'phone',
  onboarded: false,
  missing_consents: [],
  next_step: 'profile',
};

describe('getMyStatus', () => {
  it('คืนสถานะที่ parse แล้ว', async () => {
    const { client, rpc } = fakeClient({ data: status, error: null });
    await expect(createApi(client).getMyStatus()).resolves.toEqual(status);
    expect(rpc).toHaveBeenCalledWith('get_my_status');
  });

  it('server ตอบรูปร่างผิด → invalid_response (ไม่ปล่อยข้อมูลแปลกเข้าแอป)', async () => {
    const { client } = fakeClient({ data: { ...status, next_step: '???' }, error: null });
    await expect(createApi(client).getMyStatus()).rejects.toMatchObject({
      code: 'invalid_response',
    });
  });
});

describe('completeOnboarding', () => {
  it('แปลงชื่อฟิลด์เป็นพารามิเตอร์ของ RPC', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    await createApi(client).completeOnboarding({
      displayName: ' มิว ',
      birthdate: '2000-01-01',
      modes: ['friend'],
      areaId: 'ari',
    });
    expect(rpc).toHaveBeenCalledWith('complete_onboarding', {
      p_display_name: 'มิว',
      p_birthdate: '2000-01-01',
      p_modes: ['friend'],
      p_area_id: 'ari',
      p_occupation: undefined,
    });
  });

  it('ข้อมูลผิดตั้งแต่ฝั่งแอป → ไม่ยิง request', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    await expect(
      createApi(client).completeOnboarding({
        displayName: 'x',
        birthdate: '2020-01-01',
        modes: ['friend'],
      }),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('error จาก DB → ApiError code เดียวกับใน migration', async () => {
    const { client } = fakeClient({
      data: null,
      error: { message: 'birthdate_locked', code: '22023' },
    });
    const promise = createApi(client).completeOnboarding({
      displayName: 'มิว',
      birthdate: '2000-01-01',
      modes: ['friend'],
    });
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    await expect(promise).rejects.toMatchObject({ code: 'birthdate_locked' });
  });
});

describe('recordConsents', () => {
  it('ส่งเวอร์ชันปัจจุบันจาก CONSENT_VERSIONS เสมอ', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    await createApi(client).recordConsents(['terms', 'rules']);
    expect(rpc).toHaveBeenNthCalledWith(1, 'record_consent', { p_doc: 'terms', p_version: 'v1' });
    expect(rpc).toHaveBeenNthCalledWith(2, 'record_consent', { p_doc: 'rules', p_version: 'v1' });
  });
});
