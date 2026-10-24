# AGENTS.md — คู่มือสำหรับ AI / Developer ที่เข้ามาทำงานในโปรเจคนี้

> ไฟล์นี้คือ "จุดเริ่มต้น" ของทุกคน (ทั้งคนและ AI) ที่เข้ามาแตะโปรเจค **รู้กัน (rukan)**
> อ่านไฟล์นี้ให้จบก่อนแก้โค้ดใดๆ แล้วค่อยไปอ่านเอกสารใน `docs/` ตามลิงก์ด้านล่าง

---

## 1. โปรเจคนี้คืออะไร

**รู้กัน · rukan** ([rukan.app](https://rukan.app)) คือแอป "ไม่เหงา แค่เริ่มทัก" สำหรับคนวัย 18–30 (นักศึกษา + วัยทำงาน): match 1:1 + Space โพสต์แบบไม่ระบุตัวตน — ดู [`docs/PRODUCT.md`](docs/PRODUCT.md)
มี 2 client ที่ใช้ **Supabase เป็น backend ทั้งหมด** (ไม่มี API server ของตัวเอง):

| ส่วน           | เทคโนโลยี                                                            | โฟลเดอร์          | Deploy ที่                            |
| -------------- | -------------------------------------------------------------------- | ----------------- | ------------------------------------- |
| Mobile app     | React Native (**Expo**) + TypeScript                                 | `apps/mobile`     | App Store / Play Store ผ่าน EAS Build |
| Web app        | **Next.js** (App Router) + TypeScript                                | `apps/web`        | **Vercel** (Pro plan ของทีม)          |
| Backend        | **Supabase** — Postgres + Auth + Storage + Realtime + Edge Functions | `supabase/`       | Supabase Cloud                        |
| โค้ดที่ใช้ร่วม | Database types (generate) + zod schemas + constants                  | `packages/shared` | — (library ภายใน)                     |

**หัวใจของระบบนี้คือ RLS (Row Level Security)** — client ต่อ database ตรงผ่าน Supabase
ดังนั้นสิทธิ์ทุกอย่าง (ใครอ่าน/แก้แถวไหนได้) ต้องเขียนเป็น RLS policy ใน migration ไม่ใช่เช็คในโค้ด client

รายละเอียดสถาปัตยกรรม → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## 2. โครงสร้าง Repo (Monorepo: pnpm workspaces + Turborepo)

```
stuMatch/                     ← ชื่อ repo/โฟลเดอร์ยังเป็นชื่อเดิม (ชื่อแอปคือ รู้กัน · rukan)
├── AGENTS.md                 ← ไฟล์นี้ (context หลักสำหรับ AI ทุกตัว)
├── CLAUDE.md                 ← ชี้มาที่ AGENTS.md (สำหรับ Claude Code)
├── README.md                 ← วิธีเริ่มต้นสำหรับคน
├── package.json              ← root: scripts รวม (รวม db:*) + Supabase CLI
├── pnpm-workspace.yaml       ← ประกาศ workspace + nodeLinker: hoisted + allowBuilds
├── turbo.json                ← pipeline: dev / build / lint / typecheck / test
├── .nvmrc                    ← เวอร์ชัน Node ที่ทีมใช้
├── supabase/                 ← backend ทั้งหมด (จัดการด้วย Supabase CLI)
│   ├── config.toml           ← config ของ Supabase ตอนรันบนเครื่อง (auth, storage, ports)
│   ├── migrations/           ← SQL: ตาราง, RLS policy, function, trigger, storage bucket
│   ├── seed.sql              ← ข้อมูลทดสอบ (ผู้ใช้ demo) — ใช้แค่บนเครื่อง
│   ├── tests/database/       ← pgTAP tests (ทดสอบ RLS)
│   └── functions/            ← Edge Functions (Deno) — ยังไม่มี, ใช้เมื่อต้องการ logic ฝั่ง server
├── apps/
│   ├── web/                  ← Next.js 16
│   │   ├── src/app/          ← App Router
│   │   ├── src/proxy.ts      ← refresh session ของ Supabase ทุก request (Next 16 เรียก middleware ว่า proxy)
│   │   ├── src/lib/supabase/ ← client.ts (browser), server.ts (server), proxy.ts, env.ts
│   │   ├── src/components/
│   │   ├── AGENTS.md         ← กฎของ Next.js เอง (Next สร้างให้ — อ่านก่อนแก้ web)
│   │   └── .env.example
│   └── mobile/               ← Expo SDK 58 (expo-router)
│       ├── src/app/          ← route เท่านั้น (ไฟล์บางๆ import หน้าจอจาก features/) แบ่ง 3 โซน:
│       │   ├── _layout.tsx   ←   providers + Stack.Protected ตาม session + get_my_status().next_step
│       │   ├── (auth)/       ←   ยังไม่ login: sign-in
│       │   ├── (onboarding)/ ←   consents → phone → profile → selfie (เดินตามที่ server บอก ข้ามขั้นไม่ได้)
│       │   └── (app)/(tabs)/ ←   ยืนยันครบ: space / drop / chats / me
│       ├── src/features/<ฟีเจอร์>/ ← หน้าจอ + component ของแต่ละฟีเจอร์
│       ├── src/components/ui.tsx   ← UI พื้นฐาน (Screen, AppText, Button, TextField, Chip, Card)
│       ├── src/lib/api.ts    ← api / queries / queryClient ตัวเดียวของแอป (จาก @rukan/api)
│       ├── src/lib/supabase.ts         ← Supabase client ตัวเดียวของแอป
│       ├── src/lib/large-secure-store.ts ← เก็บ session แบบเข้ารหัส
│       ├── src/providers/    ← SessionProvider
│       ├── src/i18n/         ← th.ts (หลัก) / en.ts — ห้ามเขียนข้อความตรงใน component
│       ├── src/theme/        ← token สี light / gold (ชุดเดียวกับเว็บ)
│       ├── app.config.ts / eas.json
│       ├── AGENTS.md         ← กฎของ Expo เอง (Expo สร้างให้ — อ่านก่อนแก้ mobile)
│       └── .env.example
├── packages/
│   ├── shared/               ← @rukan/shared
│   │   └── src/
│   │       ├── database.types.ts ← generate จาก DB ด้วย `pnpm db:types` (ห้ามแก้มือ)
│   │       ├── schemas/      ← zod schemas สำหรับ validate ฟอร์ม
│   │       └── constants/    ← ชื่อตาราง / RPC / storage bucket
│   ├── api/                  ← @rukan/api — ทุกการเรียก Supabase (createApi(client)), ApiError, TanStack Query options
│   ├── tsconfig/             ← @rukan/tsconfig: base / nextjs
│   └── eslint-config/        ← @rukan/eslint-config: flat config กลาง (shared ใช้)
├── docs/
│   ├── ARCHITECTURE.md       ← ภาพรวมระบบ, auth, RLS, env, deploy
│   ├── CONVENTIONS.md        ← กฎการเขียนโค้ด, SQL, git, การตั้งชื่อ
│   ├── DATABASE.md           ← ★ สร้าง/sync DB บนเครื่อง, schema map, checklist เพิ่มตาราง + template
│   ├── DECISIONS.md          ← บันทึกการตัดสินใจ + เรื่องที่ยังเปิดอยู่
│   ├── AUDIT.md              ← ★ ผลตรวจล่าสุด (ช่องโหว่ / ช่องว่าง) + roadmap P0 / P1 / P2 — งานถัดไปเลือกจากที่นี่
│   ├── PRODUCT.md            ← แอปนี้คืออะไร, กลุ่มผู้ใช้, ฟีเจอร์ MVP
│   ├── SYSTEM_DESIGN.md      ← data model, schema private + RPC, flow, cron, Edge Functions, ลำดับการสร้าง
│   ├── POLICY.md             ← (ร่าง) ยืนยันตัวตน, กติกาชุมชน, PDPA
│   └── prompts/              ← prompt สำเร็จรูปสำหรับสั่ง AI ทำงานแต่ละขั้น
└── .github/workflows/ci.yml  ← CI: lint/typecheck/test/build + pgTAP + เช็ค types
```

---

## 3. คำสั่งที่ใช้บ่อย (รันจาก root)

```bash
pnpm install                     # ติดตั้งทุก package (รวม Supabase CLI)
pnpm db:start                    # เปิด Supabase บนเครื่อง (ต้องเปิด Docker ก่อน · Windows ที่ Docker Desktop ใช้ไม่ได้: pnpm db:wsl start)
pnpm db:status                   # ดู URL + publishable key สำหรับใส่ .env
pnpm db:reset                    # ล้าง DB แล้วรัน migrations + seed.sql ใหม่ทั้งหมด
pnpm db:migration <ชื่อ>         # สร้างไฟล์ migration ใหม่ใน supabase/migrations
pnpm db:types                    # generate packages/shared/src/database.types.ts จาก DB
pnpm db:test                     # รัน pgTAP tests (ทดสอบ RLS)
pnpm db:stop                     # ปิด Supabase
pnpm dev                         # รันทุก app พร้อมกัน
pnpm dev --filter=web            # รันเฉพาะ web
pnpm dev --filter=mobile         # รันเฉพาะ mobile (Expo)
pnpm lint | pnpm typecheck | pnpm test | pnpm build
pnpm format                      # จัด format ทั้ง repo ด้วย Prettier
```

URL ตอน dev:

| Service                                                | URL                                                       |
| ------------------------------------------------------ | --------------------------------------------------------- |
| Web                                                    | http://localhost:3000                                     |
| Supabase API                                           | http://127.0.0.1:54321                                    |
| Supabase Studio (ดู/แก้ข้อมูล)                         | http://127.0.0.1:54323                                    |
| Mailpit (อีเมลที่ Auth ส่ง เช่น ยืนยัน/reset password) | http://127.0.0.1:54324                                    |
| Postgres ตรง                                           | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

ผู้ใช้ทดสอบจาก `seed.sql`: `demo@rukan.dev` / `password123` และ `demo2@rukan.dev` / `password123`

> Mobile บนมือถือจริง/emulator เรียก `127.0.0.1` ไม่ได้ ต้องใช้ IP เครื่อง dev (เช่น `http://192.168.1.10:54321`)
> หรือ Android emulator ใช้ `http://10.0.2.2:54321`

เพิ่ม package ใน app ไหน ให้ `cd apps/<app>` แล้ว `pnpm add <pkg>`
(**mobile ให้ใช้ `npx expo install <pkg>`** เพื่อได้เวอร์ชันที่เข้ากับ Expo SDK)

---

## 4. กฎเหล็ก (ห้ามฝ่าฝืน)

1. **ห้าม commit secret/key ใดๆ** — repo เป็น **Public** บน GitHub
   - ไฟล์ `.env`, `.env.local`, `.env.*.local` อยู่ใน `.gitignore` แล้ว เพิ่มตัวแปรใหม่ → เพิ่มชื่อใน `.env.example`
2. **Client ใช้ได้แค่ publishable key** (`sb_publishable_...`)
   - **ห้ามใส่ secret key / service_role key** ใน `apps/web` หรือ `apps/mobile` เด็ดขาด (key นี้ข้าม RLS ได้ทั้งหมด)
   - ตัวแปร `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` ถูกฝังลง client → ใส่ได้เฉพาะค่าที่เปิดเผยได้
   - secret key ใช้ได้เฉพาะใน Edge Functions (ตั้งผ่าน `supabase secrets set`)
3. **ทุกตารางใน schema `public` ต้อง `enable row level security` + มี policy ครบ** ใน migration เดียวกับที่สร้างตาราง
   - ตารางที่เปิด RLS แต่ไม่มี policy = ไม่มีใครเข้าถึงได้ (ปลอดภัย) / ตารางที่ไม่เปิด RLS = **ทุกคนบนโลกอ่าน/แก้ได้**
   - ทุก policy ใหม่ต้องมี pgTAP test ใน `supabase/tests/database/`
4. **เปลี่ยน database ต้องทำผ่าน migration เท่านั้น** (`pnpm db:migration <ชื่อ>`) — ห้ามแก้ schema ผ่าน Dashboard/Studio ของ project จริง — ขั้นตอนครบใน [`docs/DATABASE.md`](docs/DATABASE.md) หัวข้อ 4
   - แก้ schema แล้วต้อง `pnpm db:types` และ commit `database.types.ts` ด้วย (CI เช็ค)
5. **Type ที่ใช้ข้าม app ต้องอยู่ใน `packages/shared`** — ใช้ `Database`, `Tables<'...'>` จาก `@rukan/shared` ห้ามเขียน type ของตารางเอง
6. **ห้าม push ตรงเข้า `main`** — ทำผ่าน branch + Pull Request เสมอ
7. ก่อนบอกว่างานเสร็จ ต้องผ่าน `pnpm lint && pnpm typecheck && pnpm test` และถ้าแตะ `supabase/` ต้องผ่าน `pnpm db:reset && pnpm db:test`

รายละเอียดกฎทั้งหมด → [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)

---

## 5. สถานะปัจจุบันของโปรเจค

- [x] ตกลง tech stack และโครงสร้าง monorepo
- [x] เขียนเอกสาร AGENTS.md / docs/
- [x] Scaffold monorepo (2026-10-23) แล้ว push ขึ้น https://github.com/AugWaChi12/stuMatch
- [x] ย้าย backend จาก NestJS + DigitalOcean → **Supabase** (2026-10-23, branch `feature/supabase-backend`)
  - [x] ตาราง `profiles` + RLS + trigger สร้าง profile ตอนสมัคร, function `health()`, bucket `avatars`
  - [x] ทดสอบบนเครื่องแล้ว: db:reset, db:test (9/9), login/signup ผ่าน Supabase API, web + mobile (web build) ต่อ Supabase ได้
- [ ] สร้าง Supabase project จริง + ผูก Vercel (ดู ARCHITECTURE.md หัวข้อ 6)
- [ ] ตั้ง branch protection ให้ `main` + เช็คว่า CI บน GitHub ผ่าน
- [x] ออกแบบระบบ (2026-10-24) → [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md)
- [ ] เฟส 1–5 ตาม SYSTEM_DESIGN.md หัวข้อ 14
  - [x] เฟส 1 ฝั่ง DB (2026-10-24, branch `feature/identity-core`): security baseline + รั้ว `security_invariants`, ตารางตัวตน, RPC onboarding/โปรไฟล์, bucket `photos` — pgTAP 70/70
  - [x] เฟส 1 ฝั่งแอป (2026-10-24, branch `feature/app-structure`, `feature/me-and-legal`): `packages/api` + โครง expo-router (auth / onboarding / tabs) + หน้า "ฉัน" (รูปโปรไฟล์, ข้อมูลพื้นฐาน, ความสนใจ, คำถามเปิดบทสนทนา, ตั้งค่า)
  - [x] เฟส 2–5 ฝั่ง DB + API ทั้งหมด (2026-10-24, branch `feature/me-and-legal`):
    - [x] เฟส 2 ความปลอดภัย & Moderator (`blocks` พร้อมซ่อนตัวตนเมื่อบล็อกจาก Space, `reports`, `moderation_actions`, `identity_reveals_log` + RPC ผู้ใช้/ผู้ดูแล/อุทธรณ์)
    - [x] เฟส 3 Space (`posts`, `post_replies`, `post_likes`, `mood_checkins` + กรองข้อมูลติดต่อ/PII + สัญญาณขอความช่วยเหลือ `care_notice` + ไม่ส่ง `author_id` ออกไปเด็ดขาด)
    - [x] เฟส 4 Bubble & แชท (`bubbles`, `conversations`, `conversation_members`, `messages` + เตือนคำเสี่ยงกลโกง `scam_warning` + กดเปิดตัวสองฝ่าย `request_reveal` + คำนวณ `reveal_stage` 0–3 จากข้อความของทั้งสองฝ่าย + `request_photo_unlock`)
    - [x] เฟส 5 Daily Drop & Match (`daily_drops`, `swipes`, `matches` + คัดการ์ดไม่เกิน 5 คน/วัน/โหมด + หมดอายุ 48 ชม. ถ้าไม่ทัก + `polite_close` / `unmatch` + `get_profile_card` ปลดล็อกรูปตาม `reveal_stage` และกัน scrape)
    - [x] `@rukan/shared` (types 36 RPCs + zod schemas) และ `@rukan/api` (`createApi` + `createQueries` ครบทุกเฟส) — ทดสอบ pgTAP 152/152 และ Vitest 57/57 ผ่านทั้งหมด
  - [ ] เฟส 1 ที่รอทีม: SMS OTP + liveness vendor (Q14 — **มีข้อเสนอแล้ว: ด่านแรก MediaPipe + AWS Rekognition** ดู `docs/DECISIONS.md` หัวข้อ "ข้อเสนอ: selfie liveness"), social login, Edge Functions
  - [x] admin console (`admin.rukan.app`), tier config Free / Gold, Google sign-in, แท็บ Space / Drop / แชท / ฉัน บน mobile (2026-10-24, push เข้า `main` ตรง)
  - [x] **Audit รอบแรก (2026-10-24) → [`docs/AUDIT.md`](docs/AUDIT.md)** — แก้ P0 แล้ว 2 ข้อ (moderator จากอีเมล, OAuth ไม่ใช่ PKCE) · pgTAP 155/155
  - [ ] **งานถัดไป: ดู roadmap ใน `docs/AUDIT.md` หัวข้อ 4** (P1: Drop ตามเวลาไทย, tier ต่อผู้ใช้ + จ่ายเงิน, Realtime แชท, admin ใช้ `@rukan/api`, selfie / SMS vendor)
- [ ] หน้า login / สมัคร / แก้โปรไฟล์ บน web และ mobile
- [x] Landing page rukan.app + waitlist (2026-10-24, branch `feature/web-landing`) — ทดสอบบนเครื่องแล้ว: pgTAP 20/20, ส่งฟอร์มเข้า `private.waitlist` ได้
  - [x] หน้า `/rules` `/privacy` `/terms` (TH + EN) พร้อมป้ายร่างและ sitemap (2026-10-24, branch `feature/me-and-legal`)
  - [ ] OG image, analytics, ซื้อโดเมน rukan.app (ดู `docs/WEBSITE.md`)

> **AI ที่ทำงานเสร็จแต่ละขั้น: อัปเดต checklist นี้ และบันทึกการตัดสินใจใหม่ลง `docs/DECISIONS.md` ด้วย**

เรื่องที่ทีมยังไม่ได้ตัดสินใจ (อย่าเดาเอง ให้ถามทีม หรือใช้ค่า default ที่ระบุไว้) → ดูหัวข้อ "Open questions" ใน [`docs/DECISIONS.md`](docs/DECISIONS.md)

---

## 6. วิธีทำงานสำหรับ AI

- อ่าน `AGENTS.md` → `docs/PRODUCT.md` → `docs/ARCHITECTURE.md` → `docs/SYSTEM_DESIGN.md` → `docs/DATABASE.md` → `docs/CONVENTIONS.md` → `docs/DECISIONS.md` ก่อนเริ่ม (งานที่แตะผู้ใช้/ข้อมูลส่วนตัว อ่าน `docs/POLICY.md` ด้วย)
- **ก่อนรัน/ทดสอบอะไรที่ใช้ database: ทำให้ DB บนเครื่องตรงกับ `supabase/migrations/` ก่อน** — `pnpm db:start` แล้วถ้า `supabase/` เปลี่ยนหลัง pull/สลับ branch → `pnpm db:reset && pnpm db:test` ([`docs/DATABASE.md`](docs/DATABASE.md) หัวข้อ 2)
- **ห้าม push เข้า `main` ตรง** แม้จะเป็นงานเล็ก — ทำ branch + PR เสมอ (รอบ 2026-10-24 มี ~20 commit เข้า main ตรง ดู `AUDIT.md`)
- ฟีเจอร์ที่แตะข้อมูล ทำตามลำดับ: **migration (ตาราง + RLS) → pgTAP test → `pnpm db:types` → zod schema ใน shared → UI** ตาม checklist + template ใน [`docs/DATABASE.md`](docs/DATABASE.md) หัวข้อ 4 และอัปเดตตาราง "สิ่งที่มีอยู่ตอนนี้" (หัวข้อ 3.3) ทุกครั้ง
- **แอปเรียก Supabase ผ่าน `@rukan/api` เท่านั้น** (หน้าจอไม่เรียก `supabase.from/rpc` ตรง) — เพิ่ม RPC ใหม่ = เพิ่มฟังก์ชันใน `packages/api/src/client.ts` + test
- logic ที่ client ไม่ควรทำเอง (เช่น จับคู่ match, ตรวจสิทธิ์ซับซ้อน, เรียก service ภายนอกด้วย secret) ให้ทำเป็น **Postgres function (`security definer` อย่างระวัง)** หรือ **Edge Function** — ห้ามเชื่อข้อมูลจาก client
- ใช้เวอร์ชัน stable ล่าสุดของ library ณ วันที่ทำงาน และเช็คเอกสารทางการถ้าไม่แน่ใจ (Next.js / Expo / Supabase เปลี่ยนบ่อย)
- อย่าเพิ่ม library ใหม่ถ้าของที่มีอยู่ทำได้แล้ว ถ้าจำเป็นต้องเพิ่ม ให้บันทึกเหตุผลใน `docs/DECISIONS.md`
- สรุปสิ่งที่ทำ + สิ่งที่ยังไม่ได้ทำ/ไม่ได้ทดสอบ ให้ชัดเจนเมื่อจบงาน

---

## 7. เวอร์ชันที่ใช้ + จุดที่ต้องระวัง (ณ 2026-10-23)

| เครื่องมือ                            | เวอร์ชัน                                                                         |
| ------------------------------------- | -------------------------------------------------------------------------------- |
| Node                                  | 22 (`.nvmrc`)                                                                    |
| pnpm                                  | 12.15 (`packageManager` ใน package.json)                                         |
| TypeScript                            | ~6.0 (**ไม่ใช่ 7** — typescript-eslint ยังไม่รองรับ TS 7)                        |
| Turborepo                             | 2.11                                                                             |
| Supabase CLI                          | 2.121 (devDependency ที่ root — เรียกผ่าน `pnpm db:*` หรือ `pnpm exec supabase`) |
| Postgres (local)                      | 17 (`supabase/config.toml`)                                                      |
| @supabase/supabase-js / @supabase/ssr | 2.118 / 0.12                                                                     |
| Next.js                               | 16.4                                                                             |
| Expo SDK                              | 58 (React Native 0.88, React 19.3)                                               |
| zod                                   | 4                                                                                |
| ESLint                                | 9 (eslint-config-next ยังไม่รองรับ 10)                                           |

จุดที่มักพลาด:

- **pnpm 12 ไม่อ่าน setting จาก `.npmrc`** — setting อยู่ใน `pnpm-workspace.yaml`
  - package ที่มี install script ต้องอนุญาตใน `allowBuilds` ไม่งั้น `pnpm add` จะ error `ERR_PNPM_IGNORED_BUILDS`
- **Next.js 16**: middleware เปลี่ยนชื่อเป็น `proxy.ts` (export function `proxy`) — ถ้าเผลอตั้งชื่อ `middleware.ts` session จะไม่ refresh
- **ฝั่ง server ของ Next.js เช็ค login ด้วย `supabase.auth.getClaims()`** — ห้ามใช้ `getSession()` ตัดสินสิทธิ์ (ไม่ได้ verify token)
- **Supabase client ฝั่ง server ต้องสร้างใหม่ทุก request** (`await createClient()` จาก `src/lib/supabase/server.ts`) ห้ามเก็บไว้ใน global
- **mobile บนมือถือจริงต่อ Supabase ใน WSL ไม่ได้** (WSL รับแค่ localhost ของ Windows) — ทดสอบแอปบนเครื่องด้วย `expo start --web` + `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
- ยืนยันเบอร์ (SMS OTP) บนเครื่องยังใช้ไม่ได้จนกว่าจะเลือกผู้ให้บริการ (Q14) — ทดสอบ flow ด้วยการตั้ง `auth.users.phone_confirmed_at` ผ่าน psql (ห้ามทำทางลัดในโค้ด)
- `packages/shared` ต้อง build ก่อน app อื่นจะเห็น type ใหม่ — `pnpm dev` ของ turbo build ให้ตอนเริ่ม ถ้าแก้ shared ระหว่าง dev ให้รัน `pnpm --filter @rukan/shared dev` คู่กันไป
- **Windows + Docker Desktop เปิดไม่ขึ้น** (เครื่องที่ socket file ลบไม่ได้: error "The file cannot be accessed by the system") → ใช้ Docker Engine ใน WSL Ubuntu แทน แล้วเรียก Supabase ด้วย `pnpm db:wsl <คำสั่ง>` แทน `pnpm db:*` — ขั้นตอนใน README หัวข้อ "Windows: ใช้ Docker ใน WSL"
