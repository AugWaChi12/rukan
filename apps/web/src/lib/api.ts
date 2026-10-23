import { apiErrorSchema, type ApiError } from '@stumatch/shared';
import type { z } from 'zod';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/** Error ที่ API ตอบกลับมา (รูปแบบเดียวกับ ApiError ใน @stumatch/shared) */
export class ApiRequestError extends Error {
  constructor(public readonly body: ApiError) {
    super(body.message);
    this.name = 'ApiRequestError';
  }
}

/**
 * เรียก API แล้ว validate response ด้วย zod schema
 *
 * @example
 *   const health = await apiFetch(API_ROUTES.health, healthResponseSchema);
 */
export async function apiFetch<T extends z.ZodType>(
  path: string,
  schema: T,
  init?: RequestInit,
): Promise<z.infer<T>> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...init?.headers },
  });
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(json);
    throw new ApiRequestError(
      parsed.success
        ? parsed.data
        : {
            statusCode: res.status,
            error: res.statusText,
            message: res.statusText || 'Request failed',
            details: [],
          },
    );
  }

  return schema.parse(json);
}
