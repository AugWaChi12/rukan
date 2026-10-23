/** Prefix ของทุก route ใน API (ต้องตรงกับ global prefix ใน apps/api/src/main.ts) */
export const API_PREFIX = '/api/v1';

/** Path ของ endpoint (ไม่รวม prefix) — ใช้ทั้งฝั่ง API และ client เพื่อไม่ให้พิมพ์ path ผิด */
export const API_ROUTES = {
  health: '/health',
} as const;
