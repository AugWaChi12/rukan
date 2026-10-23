import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

/** สร้าง schema ของ response แบบแบ่งหน้า: `{ data: T[], meta: {...} }` */
export function paginatedResponseSchema<T extends z.ZodType>(item: T) {
  return z.object({
    data: z.array(item),
    meta: paginationMetaSchema,
  });
}

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

/** รูปแบบ error มาตรฐานที่ API ส่งกลับ (ดู docs/ARCHITECTURE.md) */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  error: z.string(),
  message: z.string(),
  details: z.array(z.unknown()).default([]),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
