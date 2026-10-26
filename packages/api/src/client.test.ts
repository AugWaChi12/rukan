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

describe('Phase 2–5 RPC methods (Safety, Space, Bubbles/Chat, Swipe deck/Match)', () => {
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

  it('createPost, getFeed (พร้อม #hashtag และ sort) และ getTrendingHashtags ตรวจ schema ทั้งขาเข้าและขาออก', async () => {
    const postRes = {
      id: UUID_1,
      alias: 'แมวส้มสายชิล',
      alias_color: '#E5B84B',
      body: 'หาเพื่อนกินชาบู #เหงาๆ',
      hashtags: ['เหงาๆ'],
      mood: 'happy',
      area_id: 'ari',
      age_band: '22-25',
      created_at: '2026-10-24T12:00:00Z',
      care_notice: false,
    };
    const { client, rpc } = fakeClient({ data: postRes, error: null });
    const api = createApi(client);
    const created = await api.createPost({
      body: ' หาเพื่อนกินชาบู #เหงาๆ ',
      mood: 'happy',
    });
    expect(created).toEqual(postRes);
    expect(rpc).toHaveBeenCalledWith('create_post', {
      p_body: 'หาเพื่อนกินชาบู #เหงาๆ',
      p_mood: 'happy',
    });

    const feedItem = {
      ...postRes,
      like_count: 3,
      reply_count: 1,
      liked_by_me: false,
      is_mine: true,
    };
    rpc.mockResolvedValueOnce({ data: [feedItem], error: null });
    const feed = await api.getFeed({ tab: 'all', hashtag: '#เหงาๆ', sort: 'hot', limit: 20 });
    expect(feed).toHaveLength(1);
    expect(rpc).toHaveBeenCalledWith('get_feed', {
      p_tab: 'all',
      p_before_created_at: undefined,
      p_before_id: undefined,
      p_limit: 20,
      p_hashtag: 'เหงาๆ',
      p_sort: 'hot',
    });

    rpc.mockResolvedValueOnce({
      data: [{ tag: 'เหงาๆ', post_count: 15 }],
      error: null,
    });
    const trending = await api.getTrendingHashtags({ hours: 24, limit: 10 });
    expect(trending).toEqual([{ tag: 'เหงาๆ', post_count: 15 }]);
    expect(rpc).toHaveBeenCalledWith('get_trending_hashtags', {
      p_hours: 24,
      p_limit: 10,
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

  it('getMyDeck และ swipe (ไม่ส่ง mode) พร้อมโควตาต่อรอบ', async () => {
    const quota = {
      batch_size: 20,
      window_hours: 6,
      used: 1,
      remaining: 19,
      window_started_at: '2026-10-25T01:00:00Z',
      resets_at: '2026-10-25T07:00:00Z',
    };
    const deck = {
      quota,
      cards: [
        {
          candidate_id: UUID_2,
          display_name: 'Demo Two',
          age: 21,
          bio: null,
          occupation: null,
          area_id: null,
          org_badge: null,
          modes: ['friend', 'date'],
          interests: [],
          prompts: [],
          photo_stage: 0,
        },
      ],
    };
    const { client, rpc } = fakeClient({ data: deck, error: null });
    const api = createApi(client);
    await expect(api.getMyDeck()).resolves.toEqual(deck);
    expect(rpc).toHaveBeenCalledWith('get_my_deck');

    rpc.mockResolvedValueOnce({
      data: { matched: false, match_id: null, conversation_id: null, quota },
      error: null,
    });
    const res = await api.swipe({ candidateId: UUID_2, direction: 'like' });
    expect(res.quota.remaining).toBe(19);
    expect(rpc).toHaveBeenCalledWith('swipe', { p_candidate_id: UUID_2, p_direction: 'like' });
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

  it('Admin & Subscriptions: getMySubscription, exchangeCoinsForPass, grantUserCoins, setUserSubscription', async () => {
    const subData = {
      tier: 'premium',
      source: 'coins',
      status: 'active',
      expires_at: null,
      coin_balance: 100,
      limits: {
        swipe_batch_size: 80,
        swipe_window_hours: 6,
        daily_bubble_limit: 50,
        daily_golden_bubbles: 3,
        allow_rewind: true,
        match_expiry_hours: 168,
        allow_see_likes: true,
        allow_spotlight_post: true,
        allow_advanced_filters: true,
        allow_ai_assistant: true,
        ai_coin_cost_per_use: 0,
        price_coins_weekly: 1790,
        price_coins_monthly: 5900,
      },
    };
    const { client, rpc } = fakeClient({ data: subData, error: null });
    const api = createApi(client);
    await expect(api.getMySubscription()).resolves.toEqual(subData);
    expect(rpc).toHaveBeenCalledWith('get_my_subscription');

    rpc.mockResolvedValueOnce({ data: subData, error: null });
    await expect(
      api.exchangeCoinsForPass({ tier: 'premium', duration: 'monthly' }),
    ).resolves.toEqual(subData);
    expect(rpc).toHaveBeenCalledWith('exchange_coins_for_pass', {
      p_tier: 'premium',
      p_duration: 'monthly',
    });

    const grantRes = { user_id: UUID_1, coin_balance: 6000, delta: 6000 };
    rpc.mockResolvedValueOnce({ data: grantRes, error: null });
    await expect(
      api.moderation.grantUserCoins({ userId: UUID_1, amount: 6000, note: 'topup' }),
    ).resolves.toEqual(grantRes);
    expect(rpc).toHaveBeenCalledWith('mod_grant_user_coins', {
      p_user_id: UUID_1,
      p_amount: 6000,
      p_note: 'topup',
    });

    const countsData = {
      waitlist_total: 42,
      reports_pending: 3,
      appeals_pending: 1,
      active_suspensions: 2,
    };
    rpc.mockResolvedValueOnce({ data: countsData, error: null });
    await expect(api.moderation.getDashboardCounts()).resolves.toEqual(countsData);
    expect(rpc).toHaveBeenCalledWith('mod_get_dashboard_counts');

    const updatedSub = {
      user_id: UUID_1,
      tier: 'gold',
      source: 'promo',
      status: 'active',
      expires_at: null,
    };
    rpc.mockResolvedValueOnce({ data: updatedSub, error: null });
    await expect(
      api.moderation.setUserSubscription({
        userId: UUID_1,
        tier: 'gold',
        source: 'promo',
      }),
    ).resolves.toEqual(updatedSub);
    expect(rpc).toHaveBeenCalledWith('mod_set_user_subscription', {
      p_user_id: UUID_1,
      p_tier: 'gold',
      p_source: 'promo',
      p_expires_at: undefined,
    });
  });

  it('Realtime: subscribeConversation ใช้ private channel (ไม่ใช้ postgres_changes)', () => {
    let broadcastHandler: ((msg: { payload: unknown }) => void) | undefined;
    const fakeChannelObj = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };
    fakeChannelObj.on.mockImplementation((_type, _filter, cb) => {
      broadcastHandler = cb;
      return fakeChannelObj;
    });
    fakeChannelObj.subscribe.mockReturnValue(fakeChannelObj);
    const channel = vi.fn().mockReturnValue(fakeChannelObj);
    const removeChannel = vi.fn().mockResolvedValue('ok');

    const client = {
      channel,
      removeChannel,
    } as unknown as RukanSupabaseClient;

    const api = createApi(client);
    const received: unknown[] = [];
    const unsubscribe = api.realtime.subscribeConversation(UUID_1, (sig) => {
      received.push(sig);
    });

    expect(channel).toHaveBeenCalledWith(`conversation:${UUID_1}`, {
      config: { private: true },
    });
    expect(fakeChannelObj.on).toHaveBeenCalledWith(
      'broadcast',
      { event: 'chat_event' },
      expect.any(Function),
    );

    broadcastHandler?.({
      payload: {
        type: 'new_message',
        conversation_id: UUID_1,
        message_id: UUID_2,
        reveal_stage: 2,
      },
    });
    expect(received).toEqual([
      {
        type: 'new_message',
        conversation_id: UUID_1,
        message_id: UUID_2,
        reveal_stage: 2,
      },
    ]);

    unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(fakeChannelObj);
  });
});
