# Decisions — บันทึกการตัดสินใจ

> บันทึกว่า "เลือกอะไร เพราะอะไร" เพื่อให้คน/AI ที่มาทีหลังไม่ต้องถกเรื่องเดิมซ้ำ
> รูปแบบ: เพิ่มรายการใหม่ไว้ล่างสุดของแต่ละหมวด พร้อมวันที่ (YYYY-MM-DD)
> ถ้าเปลี่ยนการตัดสินใจเดิม: อย่าลบ ให้ย้ายไปหมวด "ยกเลิกแล้ว" พร้อมบอกว่าอะไรมาแทน

## ✅ ตัดสินใจแล้ว

| #   | วันที่     | เรื่อง                   | เลือก                                                                                                                  | เหตุผล                                                                                                                     |
| --- | ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| D1  | 2026-10-23 | Mobile                   | React Native + **Expo**                                                                                                | ทีมใช้ TypeScript/React อยู่แล้ว, Expo ช่วยเรื่อง build (EAS) และ monorepo                                                 |
| D2  | 2026-10-23 | Web                      | **Next.js** (App Router)                                                                                               | deploy บน Vercel ได้ดีที่สุด, เพื่อนมี Vercel Pro                                                                          |
| D4  | 2026-10-23 | Database                 | **PostgreSQL**                                                                                                         | relational เหมาะกับข้อมูล user/match/นัด (ตอนนี้เป็น Postgres ของ Supabase)                                                |
| D5  | 2026-10-23 | Repo                     | **Monorepo** (pnpm workspaces + Turborepo)                                                                             | ทีมเล็ก, ทุกส่วนเป็น TypeScript → แชร์ type ได้                                                                            |
| D6  | 2026-10-23 | Hosting web              | **Vercel Pro**                                                                                                         | Preview URL ทุก PR, จัดการ SSL/CDN ให้                                                                                     |
| D9  | 2026-10-23 | Git flow                 | `main` + `feature/*` + PR + squash merge                                                                               | เรียบง่ายพอสำหรับทีมเล็ก                                                                                                   |
| D10 | 2026-10-23 | TypeScript               | **~6.0** (ไม่ใช้ 7.0 ที่เป็น latest)                                                                                   | typescript-eslint 8.x รองรับแค่ `<6.1`                                                                                     |
| D12 | 2026-10-23 | ESLint                   | **9** ทั้ง repo                                                                                                        | ปลั๊กอินใน eslint-config-next (import, react, jsx-a11y) ยังไม่รองรับ ESLint 10                                             |
| D13 | 2026-10-23 | pnpm settings            | อยู่ใน `pnpm-workspace.yaml` (ไม่ใช่ `.npmrc`)                                                                         | pnpm 12 ไม่อ่าน setting จาก `.npmrc` แล้ว                                                                                  |
| D17 | 2026-10-23 | Mobile config            | `app.config.ts` + tsconfig ของ Expo (`expo/tsconfig.base`)                                                             | ใช้ TS ได้ + ตามที่ Expo แนะนำ                                                                                             |
| D20 | 2026-10-23 | **Backend**              | **Supabase เป็น backend ทั้งหมด** (Auth + Postgres + Storage + Realtime + Edge Functions) — ไม่มี API server ของตัวเอง | ทีมเลือก: ได้ของเร็ว, ไม่ต้องดูแล server, ได้ Auth/Storage/Realtime สำเร็จรูป — แลกกับต้องเขียน RLS ให้ถูกทุกตาราง         |
| D21 | 2026-10-23 | การคุมสิทธิ์             | **RLS ทุกตาราง + pgTAP test ทุก policy**                                                                               | client ต่อ DB ตรง → RLS คือด่านเดียวที่กันข้อมูลหลุด                                                                       |
| D22 | 2026-10-23 | Schema / migration       | **Supabase CLI migrations** (`supabase/migrations/*.sql`) — ไม่ใช้ ORM                                                 | ต้องเขียน RLS / trigger / function เป็น SQL อยู่แล้ว, type generate ได้จาก `supabase gen types`                            |
| D23 | 2026-10-23 | Auth                     | **Supabase Auth** (เริ่มที่ email + password)                                                                          | แทน JWT ที่เขียนเอง; เพิ่ม Google/Apple ได้ภายหลังโดยไม่แก้ schema                                                         |
| D24 | 2026-10-23 | Profile ของผู้ใช้        | ตาราง `public.profiles` 1:1 กับ `auth.users` สร้างด้วย trigger ตอนสมัคร                                                | pattern มาตรฐานของ Supabase — ตารางอื่นอ้าง `profiles.id`                                                                  |
| D25 | 2026-10-23 | เก็บรูปโปรไฟล์ (ตอบ Q7)  | **Supabase Storage** bucket `avatars` (public, path `<user id>/...`)                                                   | อยู่ที่เดียวกับ Auth → policy ใช้ `auth.uid()` ได้เลย                                                                      |
| D26 | 2026-10-23 | Supabase key ฝั่ง client | **publishable key** (`sb_publishable_...`) แทน anon key แบบเก่า                                                        | ระบบ key ใหม่ของ Supabase — rotate ได้โดยไม่กระทบ JWT                                                                      |
| D27 | 2026-10-23 | Session บนเว็บ           | `@supabase/ssr` + cookie + `src/proxy.ts` refresh ทุก request; ฝั่ง server เช็คด้วย `getClaims()`                      | ตามเอกสาร Supabase สำหรับ Next.js 16                                                                                       |
| D28 | 2026-10-23 | Session บนมือถือ         | `LargeSecureStore` (key AES ใน SecureStore + session เข้ารหัสใน AsyncStorage) ใช้ `expo-crypto` สุ่ม key               | ตามเอกสาร Supabase (SecureStore เก็บได้แค่ ~2KB); ใช้ expo-crypto แทน react-native-get-random-values เพราะเป็น Expo module |
| D29 | 2026-10-23 | Local dev                | `supabase start` (Supabase ทั้งชุดใน Docker) — ปิด analytics ใน config.toml                                            | analytics บน Windows ต้องเปิด Docker daemon ผ่าน TCP และไม่จำเป็นตอน dev                                                   |
| D30 | 2026-10-23 | Health check             | Postgres function `public.health()` เรียกผ่าน `supabase.rpc('health')`                                                 | ไม่มี API server แล้ว แต่ยังอยากให้หน้าแรกบอกได้ว่าต่อ Supabase + DB ได้                                                   |
| D31 | 2026-10-23 | Supabase CLI             | ติดตั้งเป็น devDependency ที่ root (`supabase` บน npm)                                                                 | ทุกคนได้ CLI เวอร์ชันเดียวกันจาก `pnpm install` ไม่ต้องติดตั้งแยก                                                          |

## ⛔ ยกเลิกแล้ว

| #                            | เดิม                                            | ยกเลิกเมื่อ | แทนด้วย                                                                                      |
| ---------------------------- | ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| D3                           | API ด้วย **NestJS**                             | 2026-10-23  | D20 Supabase (ลบ `apps/api` ออกแล้ว — ดูโค้ดเดิมได้ใน commit `314d3e3`)                      |
| D7                           | Hosting API + DB บน **DigitalOcean**            | 2026-10-23  | D20 Supabase Cloud                                                                           |
| D8                           | Secret จริงอยู่ที่ API เท่านั้น                 | 2026-10-23  | secret อยู่ใน Edge Functions / Supabase Dashboard เท่านั้น, client ใช้ publishable key (D26) |
| D11                          | Prisma 7.10                                     | 2026-10-23  | D22 Supabase CLI migrations                                                                  |
| D14, D15                     | NestJS ESM + Vitest, ESLint แทน oxlint          | 2026-10-23  | ไม่มี NestJS แล้ว                                                                            |
| D16                          | argon2 hash รหัสผ่าน                            | 2026-10-23  | Supabase Auth จัดการ (bcrypt)                                                                |
| D18                          | Migration แรกด้วย `prisma migrate diff`         | 2026-10-23  | D22                                                                                          |
| D19                          | Postgres ตอน dev ที่ port 5433 (docker-compose) | 2026-10-23  | D29 `supabase start` ใช้ port 54321–54324 ไม่ชนกับ Postgres ที่ติดตั้งบนเครื่อง              |
| T1, T2, T4 (class-validator) | Prisma / Dockerfile บน DO / class-validator     | 2026-10-23  | D20, D22                                                                                     |

## 🟡 Default ชั่วคราว (ใช้ไปก่อน ทีมยังไม่ยืนยัน)

> AI: ใช้ค่าเหล่านี้ได้เลยถ้าไม่มีคำสั่งอื่น แต่ให้ออกแบบให้เปลี่ยนทีหลังได้ง่าย

| #   | เรื่อง                     | Default                                                                               | ทางเลือกอื่น                            |
| --- | -------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------- |
| T3  | วิธี login                 | Email + password (Supabase Auth)                                                      | + Google / Apple / magic link           |
| T4  | Validation ฝั่ง client     | **zod** schema ใน `packages/shared` (กฎตรงกับ check constraint ใน DB)                 | —                                       |
| T5  | Package manager            | **pnpm**                                                                              | npm, yarn                               |
| T6  | Node version               | Node 22                                                                               | Node 24 LTS — ถ้าเปลี่ยนให้แก้ `.nvmrc` |
| T7  | Web styling                | Tailwind CSS                                                                          | CSS Modules                             |
| T8  | Mobile styling             | StyleSheet ปกติ (หรือ NativeWind)                                                     | Tamagui                                 |
| T9  | Data fetching (web/mobile) | TanStack Query ครอบ supabase-js                                                       | SWR                                     |
| T10 | Supabase region            | Singapore (`ap-southeast-1`)                                                          | —                                       |
| T11 | Logic ฝั่ง server          | Postgres function (`.rpc()`) ก่อน, Edge Function เมื่อต้องใช้ secret / service ภายนอก | —                                       |

## ❓ Open questions (ต้องให้ทีมตัดสินใจ)

| #   | คำถาม                                                 | หมายเหตุ                                                                                                       |
| --- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Q3  | GitHub repo                                           | ตอนนี้อยู่ที่ `AugWaChi12/stuMatch` — ย้ายเข้า Organization ไหม                                                |
| Q4  | ชื่อ domain                                           | ใช้กับ web + Site URL ของ Supabase Auth                                                                        |
| Q5  | Vercel Pro: สมาชิกทีมที่ push โค้ดต้องมี seat หรือไม่ | เช็คการตั้งค่า team ของเพื่อนที่มี Pro                                                                         |
| Q6  | รูปแบบการ login                                       | ดู T3                                                                                                          |
| Q9  | ขอบเขตฟีเจอร์ของ MVP                                  | match แบบไหน (1:1, กลุ่ม, กิจกรรม), นัดเวลา/สถานที่, แชท (Realtime)?                                           |
| Q10 | Supabase plan                                         | Free จะ pause project ถ้าไม่มีการใช้งาน 1 สัปดาห์ และไม่มี backup อัตโนมัติ — Pro ~$25/เดือน เมื่อมีผู้ใช้จริง |
| Q11 | แยก Supabase project dev/staging กับ prod ไหม         | แนะนำแยก: Preview ของ Vercel ชี้ไป project dev, Production ชี้ project prod                                    |
| Q12 | ใครเป็นคนรัน `supabase db push` ขึ้น prod             | หรือทำ GitHub Action อัตโนมัติหลัง merge                                                                       |
