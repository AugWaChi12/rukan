import {
  blockedUserListSchema,
  blockUserFromSchema,
  chatMessageListSchema,
  checkinMoodSchema,
  CONSENT_VERSIONS,
  conversationDetailSchema,
  conversationListSchema,
  createPostResultSchema,
  createPostSchema,
  exchangeCoinsForPassSchema,
  getFeedSchema,
  getMessagesSchema,
  getTrendingHashtagsSchema,
  interestsSchema,
  matchListSchema,
  moderationHistoryListSchema,
  modAppealListSchema,
  modDashboardCountsSchema,
  modGrantUserCoinsResultSchema,
  modGrantUserCoinsSchema,
  modListAppealsSchema,
  modListReportsSchema,
  modListWaitlistSchema,
  modReportDetailSchema,
  modReportListSchema,
  modRevealAuthorSchema,
  modRevealedAuthorSchema,
  modReviewAppealSchema,
  modSetUserSubscriptionResultSchema,
  modSetUserSubscriptionSchema,
  modTakeActionResultSchema,
  modTakeActionSchema,
  modUpdateTierConfigSchema,
  modWaitlistListSchema,
  modWaitlistStatsSchema,
  moodCheckinResultSchema,
  myBubblesSchema,
  myProfileSchema,
  myStatusSchema,
  mySubscriptionSchema,
  onboardingSchema,
  photoPositionSchema,
  politeCloseSchema,
  profileCardSchema,
  promptAnswerSchema,
  realtimeChatSignalSchema,
  realtimeInboxSignalSchema,
  replyPostResultSchema,
  replyPostSchema,
  reportResultSchema,
  reportTargetSchema,
  requestPhotoUnlockResultSchema,
  requestRevealResultSchema,
  respondBubbleResultSchema,
  respondBubbleSchema,
  sendBubbleResultSchema,
  sendBubbleSchema,
  sendMessageResultSchema,
  sendMessageSchema,
  spaceFeedSchema,
  spaceRepliesSchema,
  STORAGE_BUCKETS,
  submitAppealSchema,
  SUPABASE_RPC,
  swipeDeckSchema,
  swipeResultSchema,
  swipeSchema,
  TABLES,
  tierConfigListSchema,
  tierConfigSchema,
  trendingHashtagsSchema,
  updateProfileSchema,
  type BlockedUserItem,
  type BlockUserFromInput,
  type ChatMessage,
  type ConsentDoc,
  type ConversationDetail,
  type ConversationListItem,
  type CreatePostInput,
  type CreatePostResult,
  type Database,
  type ExchangeCoinsForPassInput,
  type GetFeedInput,
  type GetMessagesInput,
  type GetTrendingHashtagsInput,
  type MatchItem,
  type ModAppealItem,
  type ModDashboardCounts,
  type ModerationHistoryItem,
  type ModGrantUserCoinsInput,
  type ModGrantUserCoinsResult,
  type ModListAppealsInput,
  type ModListReportsInput,
  type ModListWaitlistInput,
  type ModReportDetail,
  type ModReportItem,
  type ModRevealAuthorInput,
  type ModRevealedAuthor,
  type ModReviewAppealInput,
  type ModSetUserSubscriptionInput,
  type ModSetUserSubscriptionResult,
  type ModTakeActionInput,
  type ModTakeActionResult,
  type ModUpdateTierConfigInput,
  type ModWaitlistRow,
  type ModWaitlistStats,
  type MoodCheckinResult,
  type MyBubbles,
  type MyProfile,
  type MyStatus,
  type MySubscription,
  type OnboardingInput,
  type PoliteCloseInput,
  type ProfileCard,
  type RealtimeChatSignal,
  type RealtimeInboxSignal,
  type ReplyPostInput,
  type ReplyPostResult,
  type ReportResult,
  type ReportTargetInput,
  type RequestPhotoUnlockResult,
  type RequestRevealResult,
  type RespondBubbleInput,
  type RespondBubbleResult,
  type SendBubbleInput,
  type SendBubbleResult,
  type SendMessageInput,
  type SendMessageResult,
  type SpaceMood,
  type SpacePost,
  type SpaceReply,
  type SubmitAppealInput,
  type SwipeDeck,
  type SwipeInput,
  type SwipeResult,
  type TierConfig,
  type TrendingHashtag,
  type UpdateProfileInput,
} from '@rukan/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { z } from 'zod';
import { ApiError, toApiError } from './errors';

export type RukanSupabaseClient = SupabaseClient<Database>;

type Tables = Database['public']['Tables'];
export type Area = Pick<Tables['areas']['Row'], 'id' | 'name_th' | 'name_en' | 'city'>;
export type Interest = Pick<Tables['interests']['Row'], 'id' | 'name_th' | 'name_en' | 'category'>;
export type Prompt = Pick<Tables['prompts']['Row'], 'id' | 'text_th' | 'text_en'>;
export type MyPhoto = Pick<
  Tables['photos']['Row'],
  'id' | 'storage_path' | 'position' | 'moderation_status' | 'created_at'
> & {
  signedUrl: string | null;
};
export type ProfileCardWithUrls = ProfileCard & {
  unlocked_photo_urls: string[];
};

/** โยน ApiError ถ้ามี error, ไม่งั้นคืน data */
function unwrap<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw toApiError(result.error);
  return result.data as T;
}

function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError('invalid_response', { cause: result.error });
  return result.data;
}

/**
 * API ของแอป — ทุกการเรียก Supabase ผ่านตรงนี้ (web / mobile ส่ง client ของตัวเองเข้ามา)
 * - อ่านข้อมูลของตัวเอง / เขียนอะไรก็ตาม → RPC
 * - ข้อมูลอ้างอิง (ย่าน / ความสนใจ / คำถาม) → อ่านตารางตรง (เปิดให้อ่านทุกคน)
 */
export function createApi(supabase: RukanSupabaseClient) {
  return {
    auth: {
      async signInWithEmail(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw toApiError(error);
      },
      async signUpWithEmail(email: string, password: string) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw toApiError(error);
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw toApiError(error);
      },
      /** ขอ OTP ไปที่เบอร์ (รูปแบบ E.164 ไม่มี +) — Supabase Auth ส่ง SMS */
      async requestPhoneOtp(phone: string) {
        const { error } = await supabase.auth.updateUser({ phone });
        if (error) throw toApiError(error);
      },
      /** ยืนยัน OTP → trigger ใน DB ปรับระดับเป็น 'phone' */
      async verifyPhoneOtp(phone: string, token: string) {
        const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'phone_change' });
        if (error) throw toApiError(error);
      },
      /** เริ่มกระบวนการ OAuth (เช่น Google / Apple) */
      async signInWithOAuth(provider: 'google' | 'apple', redirectTo: string) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw toApiError(error);
        return data;
      },
      /** แลกเปลี่ยน authorization code เป็น session (PKCE) */
      async exchangeCodeForSession(code: string) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw toApiError(error);
        return data;
      },
      // ไม่มี setSession(tokens) โดยตั้งใจ — รับ token จาก URL = ถูกยัด session ของคนอื่นได้ (login CSRF)
      // OAuth ทุกทางต้องผ่าน PKCE code → exchangeCodeForSession เท่านั้น (docs/AUDIT.md P0-2)
    },

    // -------------------------------------------------------------------------
    // เฟส 1: ตัวตน & โปรไฟล์ของฉัน
    // -------------------------------------------------------------------------

    async getMyStatus(): Promise<MyStatus> {
      return parse(myStatusSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyStatus)));
    },

    async getMyProfile(): Promise<MyProfile> {
      return parse(myProfileSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyProfile)));
    },

    async getMySubscription(): Promise<MySubscription> {
      return parse(
        mySubscriptionSchema,
        unwrap(await supabase.rpc(SUPABASE_RPC.getMySubscription)),
      );
    },

    async getTierConfigs(): Promise<TierConfig[]> {
      return parse(tierConfigListSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getTierConfigs)));
    },

    async exchangeCoinsForPass(input: ExchangeCoinsForPassInput): Promise<MySubscription> {
      const v = exchangeCoinsForPassSchema.parse(input);
      return parse(
        mySubscriptionSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.exchangeCoinsForPass, {
            p_tier: v.tier,
            p_duration: v.duration,
          }),
        ),
      );
    },

    async updateMyProfile(input: UpdateProfileInput): Promise<void> {
      const v = updateProfileSchema.parse(input);
      unwrap(
        await supabase.rpc(SUPABASE_RPC.updateMyProfile, {
          p_display_name: v.displayName,
          p_bio: v.bio,
          p_occupation: v.occupation,
          p_area_id: v.areaId,
          p_modes: v.modes,
          p_locale: v.locale,
          p_theme: v.theme,
        }),
      );
    },

    async completeOnboarding(input: OnboardingInput): Promise<void> {
      const v = onboardingSchema.parse(input);
      unwrap(
        await supabase.rpc(SUPABASE_RPC.completeOnboarding, {
          p_display_name: v.displayName,
          p_birthdate: v.birthdate,
          p_modes: v.modes,
          p_area_id: v.areaId,
          p_occupation: v.occupation,
        }),
      );
    },

    /** ยอมรับเอกสารเวอร์ชันปัจจุบัน (เวอร์ชันมาจาก CONSENT_VERSIONS — ไม่ให้ UI ส่งเอง) */
    async recordConsents(docs: readonly ConsentDoc[]): Promise<void> {
      for (const doc of docs) {
        unwrap(
          await supabase.rpc(SUPABASE_RPC.recordConsent, {
            p_doc: doc,
            p_version: CONSENT_VERSIONS[doc],
          }),
        );
      }
    },

    async setInterests(interestIds: string[]): Promise<void> {
      const ids = interestsSchema.parse(interestIds);
      unwrap(await supabase.rpc(SUPABASE_RPC.setInterests, { p_interest_ids: ids }));
    },

    async setPromptAnswer(promptId: string, answer: string): Promise<void> {
      const v = promptAnswerSchema.parse({ promptId, answer });
      unwrap(
        await supabase.rpc(SUPABASE_RPC.setPromptAnswer, {
          p_prompt_id: v.promptId,
          p_answer: v.answer,
        }),
      );
    },

    async listMyPhotos(): Promise<MyPhoto[]> {
      const rows =
        unwrap(
          await supabase
            .from(TABLES.photos)
            .select('id, storage_path, position, moderation_status, created_at')
            .order('position'),
        ) ?? [];
      if (rows.length === 0) return [];

      const { data: signed } = await supabase.storage.from(STORAGE_BUCKETS.photos).createSignedUrls(
        rows.map((r) => r.storage_path),
        600,
      );
      const urlByPath = new Map<string, string>();
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
      }

      return rows.map((row) => ({
        ...row,
        signedUrl: urlByPath.get(row.storage_path) ?? null,
      }));
    },

    async uploadMyPhoto(input: {
      userId: string;
      photoId: string;
      position: number;
      body: Blob | ArrayBuffer;
      contentType: 'image/webp' | 'image/jpeg';
    }): Promise<string> {
      const pos = photoPositionSchema.parse(input.position);
      const ext = input.contentType === 'image/webp' ? 'webp' : 'jpg';
      const storagePath = `${input.userId}/${input.photoId.toLowerCase()}.${ext}`;

      unwrap(
        await supabase.storage.from(STORAGE_BUCKETS.photos).upload(storagePath, input.body, {
          contentType: input.contentType,
          upsert: false,
        }),
      );

      return unwrap(
        await supabase.rpc(SUPABASE_RPC.addPhoto, {
          p_storage_path: storagePath,
          p_position: pos,
        }),
      );
    },

    async removePhoto(photoId: string): Promise<string> {
      const storagePath = unwrap(
        await supabase.rpc(SUPABASE_RPC.removePhoto, { p_photo_id: photoId }),
      );
      await supabase.storage.from(STORAGE_BUCKETS.photos).remove([storagePath]);
      return storagePath;
    },

    async listAreas(): Promise<Area[]> {
      return (
        unwrap(
          await supabase.from(TABLES.areas).select('id, name_th, name_en, city').order('sort'),
        ) ?? []
      );
    },

    async listInterests(): Promise<Interest[]> {
      return (
        unwrap(
          await supabase
            .from(TABLES.interests)
            .select('id, name_th, name_en, category')
            .order('sort'),
        ) ?? []
      );
    },

    async listPrompts(): Promise<Prompt[]> {
      return (
        unwrap(await supabase.from(TABLES.prompts).select('id, text_th, text_en').order('sort')) ??
        []
      );
    },

    // -------------------------------------------------------------------------
    // เฟส 2: ความปลอดภัย (Block / Report / Appeal / Moderator)
    // -------------------------------------------------------------------------

    async blockUserFrom(input: BlockUserFromInput): Promise<void> {
      const v = blockUserFromSchema.parse(input);
      unwrap(
        await supabase.rpc(SUPABASE_RPC.blockUserFrom, {
          p_target_type: v.targetType,
          p_target_id: v.targetId,
        }),
      );
    },

    async unblockUser(blockId: string): Promise<void> {
      unwrap(await supabase.rpc(SUPABASE_RPC.unblockUser, { p_block_id: blockId }));
    },

    async getMyBlocks(): Promise<BlockedUserItem[]> {
      return parse(blockedUserListSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyBlocks)));
    },

    async reportTarget(input: ReportTargetInput): Promise<ReportResult> {
      const v = reportTargetSchema.parse(input);
      return parse(
        reportResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.reportTarget, {
            p_target_type: v.targetType,
            p_target_id: v.targetId,
            p_reason: v.reason,
            p_details: v.details,
          }),
        ),
      );
    },

    async getMyModerationHistory(): Promise<ModerationHistoryItem[]> {
      return parse(
        moderationHistoryListSchema,
        unwrap(await supabase.rpc(SUPABASE_RPC.getMyModerationHistory)),
      );
    },

    async submitAppeal(input: SubmitAppealInput): Promise<void> {
      const v = submitAppealSchema.parse(input);
      unwrap(
        await supabase.rpc(SUPABASE_RPC.submitAppeal, {
          p_action_id: v.actionId,
          p_appeal_text: v.appealText,
        }),
      );
    },

    moderation: {
      async listReports(input: ModListReportsInput = {}): Promise<ModReportItem[]> {
        const v = modListReportsSchema.parse(input);
        return parse(
          modReportListSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modListReports, {
              p_status: v.status,
              p_limit: v.limit,
            }),
          ),
        );
      },

      async getReport(reportId: string): Promise<ModReportDetail> {
        return parse(
          modReportDetailSchema,
          unwrap(await supabase.rpc(SUPABASE_RPC.modGetReport, { p_report_id: reportId })),
        );
      },

      async revealAuthor(input: ModRevealAuthorInput): Promise<ModRevealedAuthor> {
        const v = modRevealAuthorSchema.parse(input);
        return parse(
          modRevealedAuthorSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modRevealAuthor, {
              p_target_type: v.targetType,
              p_target_id: v.targetId,
              p_reason: v.reason,
            }),
          ),
        );
      },

      async takeAction(input: ModTakeActionInput): Promise<ModTakeActionResult> {
        const v = modTakeActionSchema.parse(input);
        return parse(
          modTakeActionResultSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modTakeAction, {
              p_user_id: v.userId,
              p_action: v.action,
              p_level: v.level,
              p_reason: v.reason,
              p_until: v.until,
              p_report_id: v.reportId,
              p_target_type: v.targetType,
              p_target_id: v.targetId,
            }),
          ),
        );
      },

      async reviewAppeal(input: ModReviewAppealInput): Promise<void> {
        const v = modReviewAppealSchema.parse(input);
        unwrap(
          await supabase.rpc(SUPABASE_RPC.modReviewAppeal, {
            p_action_id: v.actionId,
            p_decision: v.decision,
          }),
        );
      },

      async listAppeals(input: ModListAppealsInput = {}): Promise<ModAppealItem[]> {
        const v = modListAppealsSchema.parse(input);
        return parse(
          modAppealListSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modListAppeals, {
              p_status: v.status,
              p_limit: v.limit,
            }),
          ),
        );
      },

      async getDashboardCounts(): Promise<ModDashboardCounts> {
        return parse(
          modDashboardCountsSchema,
          unwrap(await supabase.rpc(SUPABASE_RPC.modGetDashboardCounts)),
        );
      },

      async getWaitlistStats(): Promise<ModWaitlistStats> {
        return parse(
          modWaitlistStatsSchema,
          unwrap(await supabase.rpc(SUPABASE_RPC.modGetWaitlistStats)),
        );
      },

      async listWaitlist(input: ModListWaitlistInput = {}): Promise<ModWaitlistRow[]> {
        const v = modListWaitlistSchema.parse(input);
        return parse(
          modWaitlistListSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modListWaitlist, {
              p_limit: v.limit,
              p_offset: v.offset,
              p_search: v.search || undefined,
            }),
          ),
        );
      },

      async updateTierConfig(input: ModUpdateTierConfigInput): Promise<TierConfig> {
        const v = modUpdateTierConfigSchema.parse(input);
        return parse(
          tierConfigSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modUpdateTierConfig, {
              p_tier: v.tier,
              p_config: v.config,
            }),
          ),
        );
      },

      async setUserSubscription(
        input: ModSetUserSubscriptionInput,
      ): Promise<ModSetUserSubscriptionResult> {
        const v = modSetUserSubscriptionSchema.parse(input);
        return parse(
          modSetUserSubscriptionResultSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modSetUserSubscription, {
              p_user_id: v.userId,
              p_tier: v.tier,
              p_source: v.source,
              p_expires_at: v.expiresAt ?? undefined,
            }),
          ),
        );
      },

      async grantUserCoins(input: ModGrantUserCoinsInput): Promise<ModGrantUserCoinsResult> {
        const v = modGrantUserCoinsSchema.parse(input);
        return parse(
          modGrantUserCoinsResultSchema,
          unwrap(
            await supabase.rpc(SUPABASE_RPC.modGrantUserCoins, {
              p_user_id: v.userId,
              p_amount: v.amount,
              p_note: v.note ?? undefined,
            }),
          ),
        );
      },
    },

    // -------------------------------------------------------------------------
    // เฟส 3: Space (โพสต์ไม่ระบุตัวตน)
    // -------------------------------------------------------------------------

    async createPost(input: CreatePostInput): Promise<CreatePostResult> {
      const v = createPostSchema.parse(input);
      return parse(
        createPostResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.createPost, {
            p_body: v.body,
            p_mood: v.mood,
          }),
        ),
      );
    },

    async getFeed(input: GetFeedInput = {}): Promise<SpacePost[]> {
      const v = getFeedSchema.parse(input);
      return parse(
        spaceFeedSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.getFeed, {
            p_tab: v.tab,
            p_before_created_at: v.beforeCreatedAt,
            p_before_id: v.beforeId,
            p_limit: v.limit,
            p_hashtag: v.hashtag,
            p_sort: v.sort,
          }),
        ),
      );
    },

    async getTrendingHashtags(input: GetTrendingHashtagsInput = {}): Promise<TrendingHashtag[]> {
      const v = getTrendingHashtagsSchema.parse(input);
      return parse(
        trendingHashtagsSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.getTrendingHashtags, {
            p_hours: v.hours,
            p_limit: v.limit,
          }),
        ),
      );
    },

    async deleteMyPost(postId: string): Promise<void> {
      unwrap(await supabase.rpc(SUPABASE_RPC.deleteMyPost, { p_post_id: postId }));
    },

    async likePost(postId: string): Promise<void> {
      unwrap(await supabase.rpc(SUPABASE_RPC.likePost, { p_post_id: postId }));
    },

    async unlikePost(postId: string): Promise<void> {
      unwrap(await supabase.rpc(SUPABASE_RPC.unlikePost, { p_post_id: postId }));
    },

    async replyPost(input: ReplyPostInput): Promise<ReplyPostResult> {
      const v = replyPostSchema.parse(input);
      return parse(
        replyPostResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.replyPost, {
            p_post_id: v.postId,
            p_body: v.body,
          }),
        ),
      );
    },

    async getReplies(postId: string): Promise<SpaceReply[]> {
      return parse(
        spaceRepliesSchema,
        unwrap(await supabase.rpc(SUPABASE_RPC.getReplies, { p_post_id: postId })),
      );
    },

    async deleteMyReply(replyId: string): Promise<void> {
      unwrap(await supabase.rpc(SUPABASE_RPC.deleteMyReply, { p_reply_id: replyId }));
    },

    async checkinMood(mood: SpaceMood): Promise<MoodCheckinResult> {
      const v = checkinMoodSchema.parse(mood);
      return parse(
        moodCheckinResultSchema,
        unwrap(await supabase.rpc(SUPABASE_RPC.checkinMood, { p_mood: v })),
      );
    },

    // -------------------------------------------------------------------------
    // เฟส 4: Bubble & แชท (แชทนามแฝง + แชท Match + เปิดตัว + เปิดรูป)
    // -------------------------------------------------------------------------

    async sendBubble(input: SendBubbleInput): Promise<SendBubbleResult> {
      const v = sendBubbleSchema.parse(input);
      return parse(
        sendBubbleResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.sendBubble, {
            p_post_id: v.postId,
            p_message: v.message,
          }),
        ),
      );
    },

    async getMyBubbles(): Promise<MyBubbles> {
      return parse(myBubblesSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyBubbles)));
    },

    async respondBubble(input: RespondBubbleInput): Promise<RespondBubbleResult> {
      const v = respondBubbleSchema.parse(input);
      return parse(
        respondBubbleResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.respondBubble, {
            p_bubble_id: v.bubbleId,
            p_accept: v.accept,
          }),
        ),
      );
    },

    async getConversations(): Promise<ConversationListItem[]> {
      return parse(
        conversationListSchema,
        unwrap(await supabase.rpc(SUPABASE_RPC.getConversations)),
      );
    },

    async getConversation(conversationId: string): Promise<ConversationDetail> {
      return parse(
        conversationDetailSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.getConversation, {
            p_conversation_id: conversationId,
          }),
        ),
      );
    },

    async getMessages(input: GetMessagesInput): Promise<ChatMessage[]> {
      const v = getMessagesSchema.parse(input);
      return parse(
        chatMessageListSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.getMessages, {
            p_conversation_id: v.conversationId,
            p_before_created_at: v.beforeCreatedAt,
            p_before_id: v.beforeId,
            p_limit: v.limit,
          }),
        ),
      );
    },

    async sendMessage(input: SendMessageInput): Promise<SendMessageResult> {
      const v = sendMessageSchema.parse(input);
      return parse(
        sendMessageResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.sendMessage, {
            p_conversation_id: v.conversationId,
            p_body: v.body,
          }),
        ),
      );
    },

    async markConversationRead(conversationId: string): Promise<void> {
      unwrap(
        await supabase.rpc(SUPABASE_RPC.markConversationRead, {
          p_conversation_id: conversationId,
        }),
      );
    },

    async requestReveal(conversationId: string): Promise<RequestRevealResult> {
      return parse(
        requestRevealResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.requestReveal, {
            p_conversation_id: conversationId,
          }),
        ),
      );
    },

    async requestPhotoUnlock(conversationId: string): Promise<RequestPhotoUnlockResult> {
      return parse(
        requestPhotoUnlockResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.requestPhotoUnlock, {
            p_conversation_id: conversationId,
          }),
        ),
      );
    },

    // -------------------------------------------------------------------------
    // เฟส 5: Swipe deck & Match & Profile Card
    // -------------------------------------------------------------------------

    async getMyDeck(): Promise<SwipeDeck> {
      return parse(swipeDeckSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyDeck)));
    },

    async swipe(input: SwipeInput): Promise<SwipeResult> {
      const v = swipeSchema.parse(input);
      return parse(
        swipeResultSchema,
        unwrap(
          await supabase.rpc(SUPABASE_RPC.swipe, {
            p_candidate_id: v.candidateId,
            p_direction: v.direction,
          }),
        ),
      );
    },

    async getMyMatches(): Promise<MatchItem[]> {
      return parse(matchListSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyMatches)));
    },

    async politeClose(input: PoliteCloseInput): Promise<void> {
      const v = politeCloseSchema.parse(input);
      unwrap(
        await supabase.rpc(SUPABASE_RPC.politeClose, {
          p_match_id: v.matchId,
          p_template_id: v.templateId,
        }),
      );
    },

    async unmatch(matchId: string): Promise<void> {
      unwrap(await supabase.rpc(SUPABASE_RPC.unmatch, { p_match_id: matchId }));
    },

    async getProfileCard(userId: string): Promise<ProfileCardWithUrls> {
      const card = parse(
        profileCardSchema,
        unwrap(await supabase.rpc(SUPABASE_RPC.getProfileCard, { p_user_id: userId })),
      );
      if (card.unlocked_photo_paths.length === 0) {
        return { ...card, unlocked_photo_urls: [] };
      }

      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKETS.photos)
        .createSignedUrls(card.unlocked_photo_paths, 600);
      const urlByPath = new Map<string, string>();
      for (const item of signed ?? []) {
        if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl);
      }

      return {
        ...card,
        unlocked_photo_urls: card.unlocked_photo_paths
          .map((p) => urlByPath.get(p))
          .filter((u): u is string => typeof u === 'string'),
      };
    },

    // -------------------------------------------------------------------------
    // Realtime Private Broadcast (ตาม D36 — ห้ามใช้ postgres_changes)
    // -------------------------------------------------------------------------

    realtime: {
      /**
       * Subscribe รับสัญญาณในห้องแชทแบบ Private Broadcast (`conversation:<id>`)
       * payload มีเฉพาะสัญญาณ `{ type, conversation_id, message_id, reveal_stage }`
       * เมื่อได้รับสัญญาณ ให้ดึงข้อมูลจริงผ่าน RPC เสมอ
       */
      subscribeConversation(
        conversationId: string,
        onEvent: (signal: RealtimeChatSignal) => void,
      ): () => void {
        const channel = supabase
          .channel(`conversation:${conversationId}`, {
            config: { private: true },
          })
          .on('broadcast', { event: 'chat_event' }, (msg) => {
            const parsed = realtimeChatSignalSchema.safeParse(msg.payload);
            if (parsed.success) {
              onEvent(parsed.data);
            } else {
              onEvent({
                type: 'conversation_updated',
                conversation_id: conversationId,
              });
            }
          })
          .subscribe();

        return () => {
          void supabase.removeChannel(channel);
        };
      },

      /**
       * Subscribe รับสัญญาณภาพรวมของผู้ใช้แบบ Private Broadcast (`user:<uid>`)
       * เช่น มีข้อความใหม่ในห้องอื่น, มีคนส่ง Bubble, หรือถึงเวลาเปิด Daily Drop
       */
      subscribeUserInbox(
        userId: string,
        onEvent: (signal: RealtimeInboxSignal) => void,
      ): () => void {
        const channel = supabase
          .channel(`user:${userId}`, {
            config: { private: true },
          })
          .on('broadcast', { event: 'inbox_event' }, (msg) => {
            const parsed = realtimeInboxSignalSchema.safeParse(msg.payload);
            if (parsed.success) {
              onEvent(parsed.data);
            } else {
              onEvent({ type: 'inbox_updated' });
            }
          })
          .subscribe();

        return () => {
          void supabase.removeChannel(channel);
        };
      },
    },
  };
}

export type RukanApi = ReturnType<typeof createApi>;
