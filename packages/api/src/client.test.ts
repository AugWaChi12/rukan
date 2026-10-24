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

describe('setInterests / setPromptAnswer / photos', () => {
  it('setInterests บล็อกตั้งแต่ฝั่งแอปถ้าเลือกเกิน 10 อย่าง', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    const eleven = Array.from({ length: 11 }, (_, i) => `i_${i}`);
    await expect(createApi(client).setInterests(eleven)).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('setPromptAnswer ตัดช่องว่างและส่งไปยัง RPC', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    await createApi(client).setPromptAnswer('weekend', '  เดินเล่นสวน  ');
    expect(rpc).toHaveBeenCalledWith('set_prompt_answer', {
      p_prompt_id: 'weekend',
      p_answer: 'เดินเล่นสวน',
    });
  });

  it('uploadMyPhoto อัปโหลดเข้า bucket photos แล้วเรียก add_photo', async () => {
    const upload = vi.fn().mockResolvedValue({ data: { path: 'x' }, error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      error: null,
    });
    const client = {
      rpc,
      storage: { from: vi.fn().mockReturnValue({ upload }) },
    } as unknown as RukanSupabaseClient;

    const photoId = await createApi(client).uploadMyPhoto({
      userId: '11111111-1111-1111-1111-111111111111',
      photoId: '22222222-2222-4222-8222-222222222222',
      position: 0,
      body: new Uint8Array([1, 2, 3]).buffer,
      contentType: 'image/jpeg',
    });

    expect(upload).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: false },
    );
    expect(rpc).toHaveBeenCalledWith('add_photo', {
      p_storage_path:
        '11111111-1111-1111-1111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
      p_position: 0,
    });
    expect(photoId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('removePhoto เรียก RPC remove_photo แล้วลบไฟล์จาก storage', async () => {
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const rpc = vi.fn().mockResolvedValue({
      data: '11111111-1111-1111-1111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
      error: null,
    });
    const client = {
      rpc,
      storage: { from: vi.fn().mockReturnValue({ remove }) },
    } as unknown as RukanSupabaseClient;

    await createApi(client).removePhoto('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(rpc).toHaveBeenCalledWith('remove_photo', {
      p_photo_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    expect(remove).toHaveBeenCalledWith([
      '11111111-1111-1111-1111-111111111111/22222222-2222-4222-8222-222222222222.jpg',
    ]);
  });
});

describe('Phase 2–5 RPC methods (Safety, Space, Bubbles/Chat, Daily Drop/Match)', () => {
  const UUID_1 = '11111111-1111-4111-8111-111111111111';
  const UUID_2 = '22222222-2222-4222-8222-222222222222';

  it('blockUserFrom และ reportTarget เรียก RPC ด้วยพารามิเตอร์ที่ถูกต้อง', async () => {
    const { client, rpc } = fakeClient({
      data: { report_id: UUID_1, severity: 3, care_notice: true },
      error: null,
    });
    await createApi(client).blockUserFrom({ targetType: 'post', targetId: UUID_1 });
    expect(rpc).toHaveBeenCalledWith('block_user_from', {
      p_target_type: 'post',
      p_target_id: UUID_1,
    });

    const res = await createApi(client).reportTarget({
      targetType: 'post',
      targetId: UUID_1,
      reason: 'self_harm',
      details: 'น่าเป็นห่วง',
    });
    expect(res).toEqual({ report_id: UUID_1, severity: 3, care_notice: true });
    expect(rpc).toHaveBeenCalledWith('report_target', {
      p_target_type: 'post',
      p_target_id: UUID_1,
      p_reason: 'self_harm',
      p_details: 'น่าเป็นห่วง',
    });
  });

  it('createPost และ getFeed ตรวจ schema ทั้งขาเข้าและขาออก', async () => {
    const postRes = {
      id: UUID_1,
      alias: 'แมวส้มสายชิล',
      alias_color: '#E5B84B',
      body: 'หาเพื่อนกินชาบู',
      mood: 'happy',
      area_id: 'ari',
      age_band: '22-25',
      created_at: '2026-10-24T12:00:00Z',
      care_notice: false,
    };
    const { client, rpc } = fakeClient({ data: postRes, error: null });
    const created = await createApi(client).createPost({
      body: ' หาเพื่อนกินชาบู ',
      mood: 'happy',
    });
    expect(created).toEqual(postRes);
    expect(rpc).toHaveBeenCalledWith('create_post', {
      p_body: 'หาเพื่อนกินชาบู',
      p_mood: 'happy',
    });
  });

  it('sendBubble, sendMessage, requestReveal และ requestPhotoUnlock ทำงานถูกต้อง', async () => {
    const msgRes = {
      id: UUID_1,
      body: 'สวัสดีครับ',
      kind: 'text',
      is_mine: true,
      scam_warning: false,
      reveal_stage: 1,
      created_at: '2026-10-24T12:00:00Z',
    };
    const { client, rpc } = fakeClient({ data: msgRes, error: null });
    const sent = await createApi(client).sendMessage({
      conversationId: UUID_2,
      body: ' สวัสดีครับ ',
    });
    expect(sent.reveal_stage).toBe(1);
    expect(rpc).toHaveBeenCalledWith('send_message', {
      p_conversation_id: UUID_2,
      p_body: 'สวัสดีครับ',
    });
  });

  it('swipe, politeClose และ getProfileCard (พร้อมสร้าง signed URLs ของรูปที่ปลดล็อกแล้ว)', async () => {
    const path0 = `${UUID_2}/00000000-0000-4000-8000-000000000000.webp`;
    const cardData = {
      id: UUID_2,
      display_name: 'Demo Two',
      age: 21,
      bio: 'ชอบถ่ายรูปฟิล์ม',
      occupation: 'นักศึกษา',
      area_id: 'siam',
      modes: ['friend'],
      org_badge: null,
      verification_level: 'selfie',
      reveal_stage: 1,
      interests: ['cafe'],
      prompts: [],
      unlocked_photo_paths: [path0],
    };
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [{ path: path0, signedUrl: 'https://signed.example/photo0.webp' }],
      error: null,
    });
    const rpc = vi.fn().mockResolvedValue({ data: cardData, error: null });
    const client = {
      rpc,
      storage: { from: vi.fn().mockReturnValue({ createSignedUrls }) },
    } as unknown as RukanSupabaseClient;

    const card = await createApi(client).getProfileCard(UUID_2);
    expect(rpc).toHaveBeenCalledWith('get_profile_card', { p_user_id: UUID_2 });
    expect(createSignedUrls).toHaveBeenCalledWith([path0], 600);
    expect(card.unlocked_photo_urls).toEqual(['https://signed.example/photo0.webp']);
  });

  it('auth OAuth: signInWithOAuth + exchangeCodeForSession (PKCE เท่านั้น)', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/v2/auth' },
      error: null,
    });
    const exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: { session: { access_token: 'acc-123', refresh_token: 'ref-123' } },
      error: null,
    });

    const client = {
      auth: { signInWithOAuth, exchangeCodeForSession },
    } as unknown as RukanSupabaseClient;

    const api = createApi(client);
    const oauthRes = await api.auth.signInWithOAuth('google', 'rukan://auth/callback');
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'rukan://auth/callback', skipBrowserRedirect: true },
    });
    expect(oauthRes.url).toBe('https://accounts.google.com/o/oauth2/v2/auth');

    await api.auth.exchangeCodeForSession('test-code');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('test-code');

    // ไม่มีทางตั้ง session จาก token ดิบ (กัน login CSRF)
    expect('setSession' in api.auth).toBe(false);
  });
});
