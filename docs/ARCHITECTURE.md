# Architecture — รู้กัน (rukan)

## 1. ภาพรวมระบบ

```
┌──────────────────────┐   supabase-js (publishable key + JWT ของผู้ใช้)
│ Mobile (Expo / RN)   │──────────────┐
│ apps/mobile          │              │
└──────────────────────┘              ▼
                              ┌────────────────────────────────────────────┐
┌──────────────────────┐      │ Supabase                                   │
│ Web (Next.js)        │─────►│  ├─ Auth      (สมัคร / login / OAuth)      │
│ apps/web  @ Vercel   │      │  ├─ PostgREST (REST อัตโนมัติจากตาราง)      │
│  ├─ browser          │      │  ├─ Postgres  + RLS  ← สิทธิ์ทั้งหมดอยู่ที่นี่ │
│  └─ server (SSR)     │      │  ├─ Storage   (bucket: avatars)            │
└──────────────────────┘      │  ├─ Realtime  (แชท / แจ้งเตือน — อนาคต)    │
        ▲                     │  └─ Edge Functions (logic ที่ใช้ secret)    │
        │                     └────────────────────────────────────────────┘
        └── import types (Database) + zod schemas จาก packages/shared
```

**ไม่มี API server ของเราเอง** — client คุยกับ Supabase ตรง ทุกการเข้าถึงข้อมูลผ่าน RLS

| ส่วน    | Production                          | หมายเหตุ                                                  |
| ------- | ----------------------------------- | --------------------------------------------------------- |
| Web     | `https://<domain>`                  | Vercel                                                    |
| Backend | `https://<project-ref>.supabase.co` | Supabase Cloud (region แนะนำ: Singapore `ap-southeast-1`) |

---

## 2. หน้าที่ของแต่ละส่วน

### `supabase/` — backend

- **migrations/**: SQL ทั้งหมดของ database — ตาราง, index, RLS policy, function, trigger, storage bucket/policy
  - deploy ขึ้น project จริงด้วย `supabase db push` (ดูหัวข้อ 6)
- **seed.sql**: ข้อมูลทดสอบ ใช้แค่ตอน `pnpm db:reset` บนเครื่อง
- **tests/database/**: pgTAP tests — ทดสอบว่า RLS ทำงานถูก (anon / ผู้ใช้เจ้าของ / ผู้ใช้อื่น)
- **functions/** (ยังไม่มี): Edge Functions (Deno) สำหรับงานที่ต้องใช้ secret หรือเรียก service ภายนอก เช่น ส่ง push notification
- **config.toml**: config ตอนรันบนเครื่อง (port, auth redirect URL, storage) — ไม่ได้ sync ขึ้น project จริงอัตโนมัติ

### `apps/web` — Next.js @ Vercel

- `src/lib/supabase/client.ts` — ใช้ใน Client Component (`'use client'`)
- `src/lib/supabase/server.ts` — ใช้ใน Server Component / Server Action / Route Handler (`await createClient()` ทุก request)
- `src/proxy.ts` + `src/lib/supabase/proxy.ts` — refresh token ทุก request แล้วเขียน cookie กลับ (Next.js 16 เรียก middleware ว่า proxy)
- Auth เก็บใน **cookie** (จัดการโดย `@supabase/ssr`) — Server Component รู้ว่าใคร login
- เช็คสิทธิ์ฝั่ง server ด้วย `supabase.auth.getClaims()` เท่านั้น
- Vercel ตั้ง **Root Directory = `apps/web`** (Vercel ตรวจจับ Turborepo + `packages/shared` ให้)

### `apps/mobile` — Expo

- `src/lib/supabase.ts` — client ตัวเดียวของทั้งแอป
- Session เก็บด้วย `LargeSecureStore`: key AES อยู่ใน SecureStore (Keychain/Keystore), session ที่เข้ารหัสแล้วอยู่ใน AsyncStorage
- refresh token เฉพาะตอนแอปอยู่ foreground (AppState listener)
- OAuth / magic link ใช้ deep link scheme `rukan://` (อยู่ใน `additional_redirect_urls` ของ config.toml แล้ว)
- Build/ส่ง store ด้วย EAS (`eas build`, `eas submit`)

### `packages/api`

- `createApi(supabase)` — ฟังก์ชันมี type ของทุก RPC / ตารางที่แอปใช้ (`getMyStatus`, `completeOnboarding`, `auth.signInWithEmail` …) parse ผลด้วย zod จาก shared
- `ApiError` — error code เดียวกันทุกแอป (ตรงกับข้อความใน `raise exception` ของ RPC) + `network` / `forbidden` / `unknown`
- `createQueries(api)` + `queryKeys` — TanStack Query options (ข้อมูลของฉันอยู่ใต้ `['me']` ล้างทีเดียวตอน logout)
- ไม่สร้าง Supabase client เอง (แอปส่งเข้ามา) · Vitest ด้วย client ปลอม

### `packages/shared`

- `database.types.ts` — **generate** จาก DB ด้วย `pnpm db:types` (ห้ามแก้มือ, CI เช็คว่าตรงกับ migrations)
- `index.ts` export: `Database`, `Tables`, `TablesInsert`, `TablesUpdate`, `Json`, `Profile`
- `schemas/` — zod สำหรับ validate ฟอร์มก่อนส่ง (กฎต้องตรงกับ check constraint ใน DB — DB คือด่านสุดท้ายเสมอ)
- `constants/supabase.ts` — ชื่อตาราง (`TABLES`), RPC (`SUPABASE_RPC`), bucket (`STORAGE_BUCKETS`)
- ห้ามมี: React component, โค้ดที่ใช้ Node-only API, secret
- Build ด้วย `tsup` ออก ESM + CJS + `.d.ts`

---

## 3. Database

- Postgres ของ Supabase, schema หลักคือ `public` (ตารางของเรา) — `auth`, `storage` เป็นของ Supabase ห้ามสร้างตารางเองในนั้น
- ตาราง: ชื่อ **snake_case พหูพจน์** (`profiles`, `match_requests`), column snake_case
- ทุกตารางมี `id`, `created_at`, `updated_at` (ใช้ trigger `public.set_updated_at()` ที่มีอยู่แล้ว)
- ข้อมูลผู้ใช้: `auth.users` (Supabase จัดการ) ↔ `public.profiles` (1:1, `id` เดียวกัน) — ตารางอื่นอ้าง `profiles.id`
- Migration: `pnpm db:migration <ชื่อ>` → เขียน SQL → `pnpm db:reset` → `pnpm db:test` → `pnpm db:types`

### ตารางที่มีตอนนี้ / วิธีสร้าง DB

ดู [`DATABASE.md`](DATABASE.md) — schema map (หัวข้อ 3), วิธีสร้าง/sync DB บนเครื่อง (หัวข้อ 2), checklist เพิ่มตาราง (หัวข้อ 4)

---

## 4. Authentication

- **Supabase Auth** — ตอนนี้เปิด email + password (local ปิดการยืนยันอีเมลไว้ อีเมลที่ส่งดูได้ที่ Mailpit)
- สมัคร: `supabase.auth.signUp({ email, password, options: { data: { display_name } } })` → trigger สร้าง `profiles` ให้
- Social login (Google / Apple) — ยังไม่ตัดสินใจ (Q6) เปิดได้ใน `config.toml` (`[auth.external.google]`) + Dashboard
- ใน SQL ใช้ `(select auth.uid())` ใน policy (ห่อด้วย select เพื่อให้ Postgres cache ค่า — เร็วกว่า)

---

## 5. Environment Variables

| App    | ไฟล์ตอน dev           | ตัวแปร                                                             |
| ------ | --------------------- | ------------------------------------------------------------------ |
| web    | `apps/web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| mobile | `apps/mobile/.env`    | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

- ค่าตอน dev: `pnpm db:status` (local publishable key เป็นค่า default เดียวกันทุกเครื่อง ไม่ใช่ความลับ)
- ค่า production: Supabase Dashboard → Project Settings → API Keys → **Publishable key**
- **Secret key (`sb_secret_...`) / service_role ห้ามอยู่ใน client** — ใช้ได้เฉพาะใน Edge Functions (`supabase secrets set`) หรือเครื่องมือ admin

| Environment  | web                                                 | mobile                                                    |
| ------------ | --------------------------------------------------- | --------------------------------------------------------- |
| Local dev    | `.env.local` → local Supabase                       | `.env` → local Supabase (IP เครื่อง dev ถ้าใช้มือถือจริง) |
| Preview (PR) | Vercel Env (Preview) → Supabase project dev/staging | EAS profile `preview`                                     |
| Production   | Vercel Env (Production) → Supabase project prod     | EAS profile `production`                                  |

---

## 6. Deploy

### Supabase (ครั้งแรก)

1. สร้าง project ที่ supabase.com (region Singapore)
2. `pnpm exec supabase login` แล้ว `pnpm exec supabase link --project-ref <ref>`
3. `pnpm exec supabase db push` — apply migrations ทั้งหมดขึ้น project จริง (**seed.sql ไม่ถูก push**)
4. Dashboard → Authentication → URL Configuration: ตั้ง Site URL = `https://<domain>` และ Redirect URLs เพิ่ม `https://<domain>/**`, `rukan://**`

### Supabase (หลัง merge PR ที่มี migration ใหม่)

- `pnpm exec supabase db push` (ทำมือโดยคนที่มีสิทธิ์ project) — อนาคตทำเป็น GitHub Action ได้ (ต้องใช้ `SUPABASE_ACCESS_TOKEN` + DB password ใน GitHub Secrets)

### Web → Vercel

- Import repo, Framework = Next.js, Root Directory = `apps/web`
- ใส่ `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ใน Vercel Env (หรือใช้ Supabase integration ใน Vercel Marketplace ที่ sync ให้อัตโนมัติ)
- Merge เข้า `main` → Production, PR → Preview

### Mobile → EAS

- ใส่ `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ใน `env` ของแต่ละ profile ใน `eas.json` หรือ EAS Environment Variables

---

## 7. CI (GitHub Actions)

`.github/workflows/ci.yml` — รันทุก PR และ push เข้า `main` มี 2 job:

1. **apps**: `pnpm turbo run lint typecheck test build` (ใช้ค่า env dummy)
2. **database**: `supabase db start` (Postgres + migrations + seed) → `pnpm db:test` (pgTAP) → `pnpm db:types` แล้วเช็คว่า `database.types.ts` ที่ commit มาตรงกับ schema

Deploy ไม่ทำใน CI — Vercel deploy เองผ่าน Git integration, Supabase ใช้ `db push`
