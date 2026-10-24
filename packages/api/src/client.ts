import {
  CONSENT_VERSIONS,
  myProfileSchema,
  myStatusSchema,
  onboardingSchema,
  SUPABASE_RPC,
  TABLES,
  updateProfileSchema,
  type ConsentDoc,
  type Database,
  type MyProfile,
  type MyStatus,
  type OnboardingInput,
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

/** โยน ApiError ถ้ามี error, ไม่งั้นคืน data */
function unwrap<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw toApiError(result.error);
  return result.data;
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
    },

    async getMyStatus(): Promise<MyStatus> {
      return parse(myStatusSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyStatus)));
    },

    async getMyProfile(): Promise<MyProfile> {
      return parse(myProfileSchema, unwrap(await supabase.rpc(SUPABASE_RPC.getMyProfile)));
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
      unwrap(await supabase.rpc(SUPABASE_RPC.setInterests, { p_interest_ids: interestIds }));
    },

    async setPromptAnswer(promptId: string, answer: string): Promise<void> {
      unwrap(
        await supabase.rpc(SUPABASE_RPC.setPromptAnswer, {
          p_prompt_id: promptId,
          p_answer: answer,
        }),
      );
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
  };
}

export type RukanApi = ReturnType<typeof createApi>;
