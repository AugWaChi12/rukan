// ต้องอ้าง process.env.NEXT_PUBLIC_* ตรงๆ (ไม่ใช่ dynamic key) เพื่อให้ Next.js แทนค่าตอน build ได้
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    'ไม่พบ NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — copy apps/web/.env.example เป็น .env.local แล้วใส่ค่าจาก `pnpm db:status`',
  );
}

export const supabaseEnv = { url, publishableKey };
