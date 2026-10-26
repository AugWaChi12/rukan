import { describe, expect, it } from 'vitest';
import {
  conversationDetailSchema,
  getMessagesSchema,
  realtimeChatSignalSchema,
  realtimeInboxSignalSchema,
  sendBubbleSchema,
  sendMessageSchema,
} from './chat';
import { politeCloseSchema, profileCardSchema, swipeDeckSchema, swipeSchema } from './matching';
import {
  blockedUserItemSchema,
  blockUserFromSchema,
  modDashboardCountsSchema,
  modRevealAuthorSchema,
  modSetUserSubscriptionSchema,
  modTakeActionSchema,
  modUpdateTierConfigSchema,
  mySubscriptionSchema,
  reportTargetSchema,
  submitAppealSchema,
  tierConfigSchema,
} from './safety';
import {
  createPostSchema,
  extractHashtags,
  getFeedSchema,
  getTrendingHashtagsSchema,
  normalizeHashtag,
  replyPostSchema,
  spacePostSchema,
  trendingHashtagSchema,
} from './space';

const UUID_1 = '11111111-1111-4111-8111-111111111111';
const UUID_2 = '22222222-2222-4222-8222-222222222222';

describe('Phase 2 schemas (Safety & Moderation)', () => {
  it('blockUserFromSchema รองรับทุก targetType รวมถึงการบล็อกจากโพสต์ไม่ระบุตัวตน', () => {
    expect(blockUserFromSchema.safeParse({ targetType: 'post', targetId: UUID_1 }).success).toBe(
      true,
    );
    expect(blockUserFromSchema.safeParse({ targetType: 'invalid', targetId: UUID_1 }).success).toBe(
      false,
    );
  });

  it('blockedUserItemSchema รองรับแถวที่ซ่อนตัวตนเมื่อบล็อกจาก Space', () => {
    const anonBlock = {
      id: UUID_1,
      is_anonymous: true,
      blocked_user_id: null,
      display_name: null,
      created_at: '2026-10-24T00:00:00Z',
    };
    expect(blockedUserItemSchema.safeParse(anonBlock).success).toBe(true);
  });

  it('reportTargetSchema ตรวจเหตุผลและความยาวรายละเอียด', () => {
    expect(
      reportTargetSchema.safeParse({
        targetType: 'post',
        targetId: UUID_1,
        reason: 'self_harm',
        details: 'น่าเป็นห่วง',
      }).success,
    ).toBe(true);
    expect(
      reportTargetSchema.safeParse({
        targetType: 'post',
        targetId: UUID_1,
        reason: 'unknown_reason',
      }).success,
    ).toBe(false);
  });

  it('submitAppealSchema ต้องมีข้อความอุทธรณ์อย่างน้อย 5 ตัวอักษร', () => {
    expect(submitAppealSchema.safeParse({ actionId: UUID_1, appealText: 'abc' }).success).toBe(
      false,
    );
    expect(
      submitAppealSchema.safeParse({ actionId: UUID_1, appealText: 'ขออุทธรณ์เนื่องจากเข้าใจผิด' })
        .success,
    ).toBe(true);
  });

  it('modRevealAuthorSchema และ modTakeActionSchema บังคับระบุเหตุผลอย่างน้อย 3 ตัวอักษร', () => {
    expect(
      modRevealAuthorSchema.safeParse({ targetType: 'post', targetId: UUID_1, reason: 'ab' })
        .success,
    ).toBe(false);
    expect(
      modTakeActionSchema.safeParse({
        userId: UUID_2,
        action: 'suspend',
        level: 2,
        reason: 'คุกคามซ้ำ',
        until: '2026-11-01T00:00:00Z',
      }).success,
    ).toBe(true);
  });
});

describe('Phase 3 schemas (Space)', () => {
  it('createPostSchema บังคับข้อความ 1–500 ตัวอักษร และ mood ที่อยู่ในรายการ', () => {
    expect(createPostSchema.safeParse({ body: '   ' }).success).toBe(false);
    expect(createPostSchema.safeParse({ body: 'a'.repeat(501) }).success).toBe(false);
    expect(createPostSchema.parse({ body: ' วันนี้เหนื่อยจัง ', mood: 'tired' })).toEqual({
      body: 'วันนี้เหนื่อยจัง',
      mood: 'tired',
    });
  });

  it('getFeedSchema ตั้งค่าเริ่มต้นเป็น tab = all, limit = 20, sort = latest และรับ hashtag แบบมีหรือไม่มี # ได้', () => {
    expect(getFeedSchema.parse({})).toEqual({ tab: 'all', limit: 20, sort: 'latest' });
    expect(getFeedSchema.parse({ hashtag: '#เหงาๆ', sort: 'hot' })).toEqual({
      tab: 'all',
      limit: 20,
      hashtag: 'เหงาๆ',
      sort: 'hot',
    });
    expect(getFeedSchema.safeParse({ hashtag: 'มี เว้นวรรค' }).success).toBe(false);
  });

  it('extractHashtags และ normalizeHashtag สกัด #แท็ก ไทย/อังกฤษ ลบซ้ำ และจำกัดสูงสุด 5 แท็ก', () => {
    expect(normalizeHashtag('  #เหงาๆ  ')).toBe('เหงาๆ');
    expect(normalizeHashtag('invalid tag!')).toBeNull();
    expect(
      extractHashtags('คืนนี้ #เหงาๆ อยากหาเพื่อนคุย #Dek69 #เหงาๆ #a #b #c #dเกินลิมิต'),
    ).toEqual(['เหงาๆ', 'dek69', 'a', 'b', 'c']);
  });

  it('getTrendingHashtagsSchema และ trendingHashtagSchema ตรวจสอบข้อมูลเทรนด์มาแรง', () => {
    expect(getTrendingHashtagsSchema.parse({})).toEqual({ hours: 24, limit: 10 });
    expect(trendingHashtagSchema.safeParse({ tag: 'เหงาๆ', post_count: 42 }).success).toBe(true);
  });

  it('replyPostSchema บังคับไม่เกิน 300 ตัวอักษร', () => {
    expect(replyPostSchema.safeParse({ postId: UUID_1, body: 'x'.repeat(301) }).success).toBe(
      false,
    );
    expect(replyPostSchema.safeParse({ postId: UUID_1, body: 'เป็นกำลังใจให้นะ' }).success).toBe(
      true,
    );
  });

  it('spacePostSchema ตรวจรูปร่างโพสต์จาก get_feed พร้อม hashtags', () => {
    const post = {
      id: UUID_1,
      alias: 'แมวส้มสายชิล',
      alias_color: '#E5B84B',
      body: 'ใครอยู่แถวอารีย์บ้าง #เหงาๆ',
      hashtags: ['เหงาๆ'],
      mood: 'lonely',
      area_id: 'ari',
      age_band: '22-25',
      like_count: 2,
      reply_count: 1,
      liked_by_me: true,
      is_mine: false,
      created_at: '2026-10-24T12:00:00Z',
    };
    expect(spacePostSchema.safeParse(post).success).toBe(true);
  });
});

describe('Phase 4 schemas (Bubbles & Chat)', () => {
  it('sendBubbleSchema จำกัดข้อความทักทายไม่เกิน 200 ตัวอักษร', () => {
    expect(sendBubbleSchema.safeParse({ postId: UUID_1, message: 'x'.repeat(201) }).success).toBe(
      false,
    );
    expect(
      sendBubbleSchema.safeParse({ postId: UUID_1, message: 'ชอบร้านนี้เหมือนกัน!' }).success,
    ).toBe(true);
  });

  it('sendMessageSchema และ getMessagesSchema ตรวจสอบข้อมูลถูกต้อง', () => {
    expect(
      sendMessageSchema.safeParse({ conversationId: UUID_1, body: 'สวัสดีครับ' }).success,
    ).toBe(true);
    expect(getMessagesSchema.parse({ conversationId: UUID_1 })).toEqual({
      conversationId: UUID_1,
      limit: 50,
    });
  });

  it('conversationDetailSchema รองรับทั้งแชทนามแฝง (peer.user_id = null) และแชทที่เปิดตัวแล้ว', () => {
    const detail = {
      id: UUID_1,
      kind: 'anon',
      is_anonymous: true,
      reveal_stage: 0,
      match_id: null,
      closed_at: null,
      closed_reason: null,
      peer: {
        user_id: null,
        display_name: null,
        alias: 'กระต่ายถือร่ม',
        alias_color: '#6BB8A6',
      },
      my_message_count: 2,
      peer_message_count: 3,
      my_wants_reveal: true,
      peer_wants_reveal: false,
      my_wants_photo_unlock: false,
      peer_wants_photo_unlock: false,
      next_stage_target_messages: 5,
      my_messages_needed_for_next_stage: null,
      peer_messages_needed_for_next_stage: null,
    };
    expect(conversationDetailSchema.safeParse(detail).success).toBe(true);
  });
});

describe('Phase 5 schemas (Swipe deck & Match)', () => {
  it('swipeSchema รับเฉพาะทิศทาง like/skip และไม่มี mode', () => {
    expect(swipeSchema.safeParse({ candidateId: UUID_2, direction: 'like' }).success).toBe(true);
    expect(swipeSchema.safeParse({ candidateId: UUID_2, direction: 'superlike' }).success).toBe(
      false,
    );
  });

  it('swipeDeckSchema ตรวจโควตาต่อรอบ (resets_at เป็น null ได้ก่อนปัดใบแรก)', () => {
    const deck = {
      quota: {
        batch_size: 20,
        window_hours: 6,
        used: 0,
        remaining: 20,
        window_started_at: null,
        resets_at: null,
      },
      cards: [],
    };
    expect(swipeDeckSchema.safeParse(deck).success).toBe(true);
    expect(swipeDeckSchema.safeParse({ ...deck, quota: { batch_size: 20 } }).success).toBe(false);
  });

  it('politeCloseSchema ตั้งค่า templateId เริ่มต้นเป็น thanks', () => {
    expect(politeCloseSchema.parse({ matchId: UUID_1 })).toEqual({
      matchId: UUID_1,
      templateId: 'thanks',
    });
  });

  it('profileCardSchema ตรวจข้อมูลการ์ดโปรไฟล์ตาม reveal_stage', () => {
    const card = {
      id: UUID_2,
      display_name: 'Demo Two',
      age: 21,
      bio: 'ชอบถ่ายรูปฟิล์ม',
      occupation: 'นักศึกษา',
      area_id: 'siam',
      modes: ['friend', 'date'],
      org_badge: null,
      verification_level: 'selfie',
      reveal_stage: 1,
      interests: ['cafe', 'film'],
      prompts: [{ prompt_id: 'sunday', answer: 'เดินหอศิลป์' }],
      unlocked_photo_paths: [`${UUID_2}/00000000-0000-4000-8000-000000000000.webp`],
    };
    expect(profileCardSchema.safeParse(card).success).toBe(true);
  });
});

describe('P1 schemas (Tiers, Subscriptions, Admin & Realtime Broadcast)', () => {
  it('mySubscriptionSchema และ tierConfigSchema ตรวจสอบข้อมูลแพ็กเกจถูกต้อง', () => {
    const sub = {
      tier: 'premium',
      source: 'revenuecat_ios',
      status: 'active',
      expires_at: '2026-11-24T00:00:00Z',
      limits: {
        swipe_batch_size: 40,
        swipe_window_hours: 6,
        daily_bubble_limit: 30,
        daily_golden_bubbles: 1,
        allow_rewind: true,
        match_expiry_hours: 96,
        allow_see_likes: true,
        allow_spotlight_post: true,
        allow_advanced_filters: true,
      },
    };
    expect(mySubscriptionSchema.safeParse(sub).success).toBe(true);

    const cfg = {
      tier: 'free',
      display_name: 'ผู้ใช้ทั่วไป (Free Tier)',
      swipe_batch_size: 20,
      swipe_window_hours: 6,
      daily_bubble_limit: 3,
      daily_golden_bubbles: 0,
      allow_rewind: false,
      match_expiry_hours: 48,
      allow_see_likes: false,
      allow_spotlight_post: false,
      allow_advanced_filters: false,
      price_thb_monthly: 0,
    };
    expect(tierConfigSchema.safeParse(cfg).success).toBe(true);
    expect(
      modUpdateTierConfigSchema.safeParse({
        tier: 'premium',
        config: { swipe_batch_size: 30, price_thb_monthly: 199 },
      }).success,
    ).toBe(true);
    expect(
      modSetUserSubscriptionSchema.safeParse({
        userId: UUID_1,
        tier: 'premium',
        source: 'promo',
      }).success,
    ).toBe(true);
    expect(
      modDashboardCountsSchema.safeParse({
        waitlist_total: 10,
        reports_pending: 2,
        appeals_pending: 1,
        active_suspensions: 0,
      }).success,
    ).toBe(true);
  });

  it('realtimeChatSignalSchema และ realtimeInboxSignalSchema ตรวจสัญญาณ private broadcast', () => {
    expect(
      realtimeChatSignalSchema.safeParse({
        type: 'new_message',
        conversation_id: UUID_1,
        message_id: UUID_2,
        reveal_stage: 1,
      }).success,
    ).toBe(true);
    expect(
      realtimeInboxSignalSchema.safeParse({
        type: 'bubble_received',
        conversation_id: null,
      }).success,
    ).toBe(true);
  });
});
