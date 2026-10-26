/** ชื่อ Postgres function ที่ client เรียกผ่าน `supabase.rpc(...)` (ต้องตรงกับ supabase/migrations) */
export const SUPABASE_RPC = {
  // ระบบพื้นฐาน & waitlist & แพ็กเกจ
  health: 'health',
  joinWaitlist: 'join_waitlist',
  getTierConfigs: 'get_tier_configs',
  getMySubscription: 'get_my_subscription',
  exchangeCoinsForPass: 'exchange_coins_for_pass',
  useAiWingman: 'use_ai_wingman',
  // เฟส 1: ตัวตน & โปรไฟล์
  getMyStatus: 'get_my_status',
  getMyProfile: 'get_my_profile',
  updateMyProfile: 'update_my_profile',
  completeOnboarding: 'complete_onboarding',
  recordConsent: 'record_consent',
  setInterests: 'set_interests',
  setPromptAnswer: 'set_prompt_answer',
  addPhoto: 'add_photo',
  removePhoto: 'remove_photo',
  // เฟส 2: ความปลอดภัย & ผู้ดูแล (Moderation)
  blockUserFrom: 'block_user_from',
  unblockUser: 'unblock_user',
  getMyBlocks: 'get_my_blocks',
  reportTarget: 'report_target',
  getMyModerationHistory: 'get_my_moderation_history',
  submitAppeal: 'submit_appeal',
  modListReports: 'mod_list_reports',
  modGetReport: 'mod_get_report',
  modRevealAuthor: 'mod_reveal_author',
  modTakeAction: 'mod_take_action',
  modReviewAppeal: 'mod_review_appeal',
  modListAppeals: 'mod_list_appeals',
  modGetDashboardCounts: 'mod_get_dashboard_counts',
  modGetWaitlistStats: 'mod_get_waitlist_stats',
  modListWaitlist: 'mod_list_waitlist',
  modUpdateTierConfig: 'mod_update_tier_config',
  modSetUserSubscription: 'mod_set_user_subscription',
  modGrantUserCoins: 'mod_grant_user_coins',
  modListUsers: 'mod_list_users',
  modSetUserVerification: 'mod_set_user_verification',
  modSetUserModes: 'mod_set_user_modes',
  // Web Top-up Portal & Slips
  getUserTopupInfo: 'get_user_topup_info',
  createTopupOrder: 'create_topup_order',
  getMyTopupOrders: 'get_my_topup_orders',
  modApproveTopupOrder: 'mod_approve_topup_order',
  // เฟส 3: Space (โพสต์ไม่ระบุตัวตน)
  createPost: 'create_post',
  getFeed: 'get_feed',
  getTrendingHashtags: 'get_trending_hashtags',
  deleteMyPost: 'delete_my_post',
  likePost: 'like_post',
  unlikePost: 'unlike_post',
  replyPost: 'reply_post',
  getReplies: 'get_replies',
  deleteMyReply: 'delete_my_reply',
  checkinMood: 'checkin_mood',
  createStory: 'create_story',
  getActiveStories: 'get_active_stories',
  deleteMyStory: 'delete_my_story',
  // เฟส 4: Bubble & แชท & Realtime
  sendBubble: 'send_bubble',
  getMyBubbles: 'get_my_bubbles',
  respondBubble: 'respond_bubble',
  getConversations: 'get_conversations',
  getConversation: 'get_conversation',
  getMessages: 'get_messages',
  sendMessage: 'send_message',
  markConversationRead: 'mark_conversation_read',
  requestReveal: 'request_reveal',
  requestPhotoUnlock: 'request_photo_unlock',
  canAccessRealtimeTopic: 'can_access_realtime_topic',
  // เฟส 5: Daily Drop & Match
  getMyDeck: 'get_my_deck',
  swipe: 'swipe',
  getMyMatches: 'get_my_matches',
  politeClose: 'polite_close',
  unmatch: 'unmatch',
  getProfileCard: 'get_profile_card',
} as const;

/** ชื่อ Storage bucket (ต้องตรงกับ supabase/migrations) — ทุก bucket เป็น private */
export const STORAGE_BUCKETS = {
  /** รูปโปรไฟล์ — path ต้องเป็น `<user id>/<uuid>.webp|jpg` (อัปโหลดแล้วเรียก add_photo) */
  photos: 'photos',
  /** รูปใน Space โพสต์ & Stories (สาธารณะสำหรับอ่าน) */
  spaceMedia: 'space_media',
  /** สลิปการโอนเงินสำหรับเติมเหรียญ */
  slips: 'slips',
} as const;

/** ตารางที่ client อ่านตรงได้ด้วย `supabase.from(...)` (ตาม RLS) — เขียนต้องผ่าน RPC เสมอ */
export const TABLES = {
  /** อ่านได้แค่แถวของตัวเอง */
  profiles: 'profiles',
  profileInterests: 'profile_interests',
  profilePrompts: 'profile_prompts',
  photos: 'photos',
  /** ข้อมูลอ้างอิง อ่านได้ทุกคน */
  areas: 'areas',
  interests: 'interests',
  prompts: 'prompts',
} as const;
