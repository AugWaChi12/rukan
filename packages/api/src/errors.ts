/**
 * error ทุกแบบที่ API คืน — แปลงจาก error ของ Postgres / Supabase ให้เป็น code เดียวกันทุกแอป
 * code ฝั่ง DB คือข้อความใน `raise exception '<code>'` ของ RPC (supabase/migrations)
 */
export const API_ERROR_CODES = [
  // จาก RPC
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
