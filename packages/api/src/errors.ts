/**
 * error ทุกแบบที่ API คืน — แปลงจาก error ของ Postgres / Supabase ให้เป็น code เดียวกันทุกแอป
 * code ฝั่ง DB คือข้อความใน `raise exception '<code>'` ของ RPC (supabase/migrations)
 */
export const API_ERROR_CODES = [
  // จาก RPC พื้นฐาน & เฟส 1 (ตัวตน/โปรไฟล์)
  'not_authenticated',
  'account_restricted',
  'verification_required',
  'rate_limited',
  'invalid_email',
  'consent_required',
  'invalid_consent_version',
  'invalid_display_name',
  'modes_required',
  'invalid_area',
  'underage',
  'invalid_birthdate',
  'birthdate_locked',
  'too_many_interests',
  'invalid_interest',
  'too_many_prompts',
  'invalid_prompt',
  'invalid_photo_path',
  'photo_not_uploaded',
  'photo_not_found',
  // เฟส 2: ความปลอดภัย & ผู้ดูแล (Moderation)
  'invalid_target_type',
  'target_not_found',
  'cannot_target_self',
  'invalid_report_reason',
  'invalid_report_details',
  'invalid_appeal_text',
  'action_not_found',
  'cannot_appeal_action',
  'appeal_already_submitted',
  'appeal_window_expired',
  'invalid_report_status',
  'report_not_found',
  'invalid_reveal_reason',
  'invalid_mod_action',
  'invalid_mod_level',
  'invalid_mod_reason',
  'invalid_suspend_until',
  'invalid_appeal_decision',
  'appeal_not_pending',
  'same_moderator_cannot_review_appeal',
  // เฟส 3: Space (โพสต์ไม่ระบุตัวตน)
  'invalid_post_body',
  'invalid_mood',
  'contains_prohibited_contact',
  'invalid_feed_tab',
  'post_not_found',
  'invalid_reply_body',
  'reply_not_found',
  // เฟส 4: Bubble & แชท
  'invalid_bubble_message',
  'cannot_bubble_own_post',
  'bubble_already_sent',
  'bubble_not_found',
  'bubble_already_responded',
  'conversation_not_found',
  'invalid_message_body',
  'conversation_closed',
  'must_reveal_identity_first',
  // เฟส 5: Daily Drop & Match
  'invalid_mode',
  'invalid_swipe_direction',
  'candidate_not_in_drop',
  'invalid_polite_template',
  'match_not_found',
  'profile_not_accessible',
  // ทั่วไป
  'forbidden',
  'invalid_response',
  'network',
  'unknown',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** รายละเอียดเพิ่ม เช่น ระดับการยืนยันที่ต้องการ ('phone' / 'selfie') */
  readonly detail: string | undefined;

  constructor(code: ApiErrorCode, options?: { detail?: string; cause?: unknown }) {
    super(code, { cause: options?.cause });
    this.name = 'ApiError';
    this.code = code;
    this.detail = options?.detail;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const KNOWN = new Set<string>(API_ERROR_CODES);

/** รูปร่างคร่าวๆ ของ PostgrestError / AuthError ที่เราใช้ */
interface SupabaseLikeError {
  message?: string;
  code?: string;
  details?: string | null;
  status?: number;
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const e = (error ?? {}) as SupabaseLikeError;
  const message = e.message ?? '';
  const detail = e.details ?? undefined;

  if (KNOWN.has(message)) {
    return new ApiError(message as ApiErrorCode, { detail, cause: error });
  }
  // ไม่มีสิทธิ์ (เช่น ยังไม่ login แล้วเรียก RPC ที่ต้อง login)
  if (e.code === '42501') return new ApiError('forbidden', { detail: message, cause: error });
  if (e.code === '28000') return new ApiError('not_authenticated', { cause: error });
  // fetch ล้ม (ไม่มีเน็ต / server ปิด)
  if (error instanceof TypeError || /fetch|network/i.test(message)) {
    return new ApiError('network', { cause: error });
  }
  return new ApiError('unknown', { detail: message || undefined, cause: error });
}
