# Prompt 01 — Scaffold Monorepo (stuMatch)

> **วิธีใช้:** copy ทุกอย่างในกรอบ "PROMPT" ด้านล่างไปวางให้ AI coding agent (Claude Code, Cursor, Codex ฯลฯ)
> โดยเปิด AI ที่ root ของ repo (`stuMatch/`) ซึ่งมีไฟล์ `AGENTS.md` และ `docs/` อยู่แล้ว

---

## PROMPT

````
คุณคือ senior full-stack engineer งานนี้คือ scaffold monorepo ของโปรเจค "stuMatch" ให้พร้อมพัฒนาต่อ
(ยังไม่ต้องทำฟีเจอร์ business ใดๆ — เอาแค่โครงที่รันได้ครบทุก app และเชื่อมกันได้)

## ขั้นที่ 0 — อ่าน context ก่อน (บังคับ)
อ่านไฟล์เหล่านี้ให้ครบก่อนเริ่ม และทำตามทุกข้อ:
1. AGENTS.md
2. docs/ARCHITECTURE.md
3. docs/CONVENTIONS.md
4. docs/DECISIONS.md (ใช้ค่าในหมวด "Default ชั่วคราว" สำหรับเรื่องที่ยังไม่ตัดสินใจ)

ห้ามลบหรือเขียนทับไฟล์เหล่านี้ (แก้เพิ่มได้เฉพาะตามที่ระบุในขั้นสุดท้าย)

## ข้อกำหนดทั่วไป
- ใช้ **pnpm** + **Turborepo**, TypeScript `strict` ทุกที่
- ใช้ **เวอร์ชัน stable ล่าสุด** ของทุก library ณ วันที่ทำ ถ้า CLI scaffolder (create-next-app, @nestjs/cli, create-expo-app) มีให้ใช้ ให้ใช้ CLI แล้วค่อยปรับ แทนการเขียนเองทั้งหมด
- ถ้าเอกสารทางการแนะนำวิธีที่ต่างจากที่ระบุ (เช่น config ของ Expo ใน monorepo) ให้ทำตามเอกสารทางการ แล้วบันทึกเหตุผลใน docs/DECISIONS.md
- ห้ามใส่ secret จริงลงไฟล์ใดๆ ที่ถูก commit
- ชื่อ package ภายในใช้ scope `@stumatch/*`
- ทำงานเป็นขั้นๆ ตามลำดับด้านล่าง และหลังแต่ละขั้นให้รันคำสั่งตรวจสอบที่ระบุ ถ้าไม่ผ่านให้แก้ก่อนไปขั้นถัดไป

## ขั้นที่ 1 — Root ของ monorepo
สร้าง/ตั้งค่า:
- `package.json` (private: true, `packageManager` ระบุ pnpm version, `engines.node`)
  scripts:
  - `dev`, `build`, `lint`, `typecheck`, `test`, `format` → เรียก `turbo run <task>`
  - `db:up` → `docker compose -f infra/docker-compose.yml up -d`
  - `db:down` → `docker compose -f infra/docker-compose.yml down`
  - `db:migrate` → `pnpm --filter api prisma migrate dev`
  - `db:studio` → `pnpm --filter api prisma studio`
  - `db:seed` → `pnpm --filter api prisma db seed`
- `pnpm-workspace.yaml` → `apps/*`, `packages/*`
- `turbo.json` → tasks: `build` (dependsOn ^build, outputs dist/.next), `dev` (persistent, cache false, dependsOn ^build), `lint`, `typecheck` (dependsOn ^build), `test`
- `.npmrc` → `node-linker=hoisted` (จำเป็นสำหรับ React Native/Expo) — ตรวจสอบกับเอกสาร Expo monorepo ล่าสุด
- `.nvmrc` → Node LTS ปัจจุบัน
- `.gitignore` → node_modules, dist, .next, .expo, .turbo, coverage, *.log, `.env`, `.env.local`, `.env.*.local`, `!.env.example`, ไฟล์ OS/IDE, `ios/` `android/` ของ Expo (ถ้าใช้ CNG), `*.keystore`, `*.jks`, `*.p8`, `*.p12`, `*.mobileprovision`, `google-services.json`, `GoogleService-Info.plist`
- `.editorconfig`, `.prettierrc`, `.prettierignore`
- ESLint config กลาง (flat config) ที่แต่ละ app ใช้ต่อได้

ตรวจสอบ: `pnpm install` สำเร็จ

## ขั้นที่ 2 — packages/tsconfig
- package `@stumatch/tsconfig` มี `base.json`, `nestjs.json`, `nextjs.json`, `react-native.json`
- ทุก app/package ต้อง `extends` จากที่นี่

## ขั้นที่ 3 — packages/shared
- package `@stumatch/shared`, build ด้วย `tsup` → `dist/` ออก ESM + CJS + `.d.ts`
- `package.json` มี `exports` ที่ถูกต้องสำหรับทั้ง `import` และ `require`
- dependency: `zod`
- โครงสร้าง:
  ```
  src/
  ├── index.ts              ← re-export ทุกอย่าง
  ├── constants/api.ts      ← API_PREFIX = '/api/v1', และ route constants
  ├── schemas/health.ts     ← healthResponseSchema + type HealthResponse
  └── schemas/common.ts     ← paginationQuerySchema, paginatedResponse helper, apiErrorSchema
  ```
- scripts: `build`, `dev` (tsup --watch), `typecheck`, `lint`, `test` (vitest)
- เขียน unit test อย่างน้อย 1 ไฟล์สำหรับ schema

ตรวจสอบ: `pnpm --filter @stumatch/shared build && pnpm --filter @stumatch/shared test`

## ขั้นที่ 4 — infra/docker-compose.yml
- service `postgres` (image postgres รุ่น stable ล่าสุด แบบ alpine), port 5432, volume ชื่อ `stumatch_pgdata`, healthcheck ด้วย `pg_isready`
- ค่า user/password/db ใช้ค่า dev (`stumatch` / `stumatch` / `stumatch_dev`) อ่านจาก `infra/.env` ได้ถ้ามี (ทำ `infra/.env.example` ด้วย)

ตรวจสอบ: `pnpm db:up` แล้ว container healthy

## ขั้นที่ 5 — apps/api (NestJS)
- สร้างด้วย NestJS CLI แล้วย้าย/ปรับให้อยู่ใน monorepo (ชื่อ package `api`)
- ตั้งค่า:
  - global prefix `api/v1`, port จาก env `PORT` (default 4000)
  - CORS อนุญาต origin จาก `CORS_ORIGINS` (comma-separated)
  - `src/config/` → โหลด env ด้วย `@nestjs/config` + validate ด้วย zod; ขาดตัวแปรต้อง throw ตอน start พร้อมบอกชื่อ
  - `src/prisma/` → `PrismaModule` (global) + `PrismaService` (connect on init, graceful shutdown)
  - `src/common/` → global exception filter ให้ error ออกตาม format ใน docs/ARCHITECTURE.md, zod validation pipe ที่ใช้ schema จาก `@stumatch/shared`
  - `src/modules/health/` → `GET /api/v1/health` ตอบตาม `healthResponseSchema` (เช็ค DB ด้วย `SELECT 1`)
  - Swagger ที่ `/api/docs` (เปิดเฉพาะเมื่อ NODE_ENV !== 'production')
  - Security พื้นฐาน: `helmet`, rate limit (`@nestjs/throttler`)
- Prisma:
  - `prisma/schema.prisma` provider postgresql, `DATABASE_URL` จาก env
  - model ตั้งต้น 1 ตัวเพื่อทดสอบ migration:
    ```prisma
    model User {
      id           String   @id @default(uuid()) @db.Uuid
      email        String   @unique
      passwordHash String   @map("password_hash")
      displayName  String   @map("display_name")
      createdAt    DateTime @default(now()) @map("created_at")
      updatedAt    DateTime @updatedAt @map("updated_at")
      @@map("users")
    }
    ```
  - สร้าง migration แรกชื่อ `init`
  - `prisma/seed.ts` สร้าง user ทดสอบ 1 คน (password hash ด้วย argon2) และตั้ง `prisma.seed` ใน package.json
- `.env.example`:
  ```
  NODE_ENV=development
  PORT=4000
  DATABASE_URL=postgresql://stumatch:stumatch@localhost:5432/stumatch_dev?schema=public
  CORS_ORIGINS=http://localhost:3000,http://localhost:8081
  JWT_ACCESS_SECRET=change-me
  JWT_REFRESH_SECRET=change-me
  JWT_ACCESS_EXPIRES_IN=15m
  JWT_REFRESH_EXPIRES_IN=30d
  ```
  (ยังไม่ต้องทำ auth แค่ประกาศตัวแปรและ validate ไว้)
- Tests: unit test ของ HealthService, e2e test `GET /api/v1/health`
- `Dockerfile` (multi-stage, build context = root ของ repo):
  - ใช้ `turbo prune api --docker` ใน stage แรก
  - stage สุดท้ายเป็น node slim/alpine, รันด้วย user ที่ไม่ใช่ root
  - CMD: `prisma migrate deploy && node dist/main.js`
  - ทำ `.dockerignore` ที่ root ด้วย
- scripts ใน package.json: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:e2e`, `prisma`

ตรวจสอบ:
- `pnpm db:migrate` สำเร็จ
- `pnpm dev --filter=api` แล้ว `curl http://localhost:4000/api/v1/health` ได้ `{"status":"ok",...}`
- `pnpm --filter api test` ผ่าน
- `docker build -f apps/api/Dockerfile .` build ผ่าน (ถ้ามี Docker)

## ขั้นที่ 6 — apps/web (Next.js)
- สร้างด้วย `create-next-app` (TypeScript, App Router, `src/` dir, Tailwind, ESLint) ชื่อ package `web`
- เพิ่ม `@stumatch/shared` เป็น dependency (`workspace:*`) และตั้ง `transpilePackages` ถ้าจำเป็น
- `src/lib/api.ts` → fetch wrapper กลาง: base URL จาก `NEXT_PUBLIC_API_URL`, แนบ JSON headers, parse error ตาม `apiErrorSchema`
- หน้าแรก (`src/app/page.tsx`) แสดงชื่อ "stuMatch" และสถานะ API โดยเรียก `/health` แล้ว validate ด้วย `healthResponseSchema`
- `.env.example` → `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`
- scripts: `dev` (port 3000), `build`, `start`, `lint`, `typecheck`

ตรวจสอบ: `pnpm dev --filter=web` แล้วหน้าแรกแสดงสถานะ API = ok (ขณะ API รันอยู่), `pnpm --filter web build` ผ่าน

## ขั้นที่ 7 — apps/mobile (Expo)
- สร้างด้วย `create-expo-app` template ที่มี TypeScript + `expo-router` ชื่อ package `mobile`
- ตั้งค่าให้ทำงานใน pnpm monorepo ตามเอกสาร Expo ล่าสุด (metro config ถ้ายังจำเป็น)
- เพิ่ม `@stumatch/shared` (`workspace:*`)
- `src/lib/api.ts` → fetch wrapper แบบเดียวกับ web แต่ base URL จาก `EXPO_PUBLIC_API_URL`
- หน้าแรกแสดง "stuMatch" + สถานะ API
- ติดตั้ง `expo-secure-store` ไว้ (สำหรับเก็บ token ในอนาคต)
- `app.config.ts` (ไม่ใช่ app.json) ตั้ง name "stuMatch", slug "stumatch", scheme "stumatch"
- `eas.json` มี profile `development`, `preview`, `production`
- `.env.example`:
  ```
  # มือถือจริง: ใช้ IP เครื่อง dev เช่น http://192.168.1.10:4000/api/v1
  # Android emulator: http://10.0.2.2:4000/api/v1
  EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
  ```
- scripts: `dev` (expo start), `android`, `ios`, `lint`, `typecheck`

ตรวจสอบ: `pnpm --filter mobile typecheck` ผ่าน และ `pnpm dev --filter=mobile` เปิด Metro ได้โดยไม่มี error การ resolve `@stumatch/shared`

## ขั้นที่ 8 — CI
`.github/workflows/ci.yml`:
- trigger: pull_request และ push เข้า `main`
- steps: checkout → pnpm/action-setup → setup-node (อ่าน `.nvmrc`, cache pnpm) → `pnpm install --frozen-lockfile` → `pnpm turbo run lint typecheck test build`
- มี service container postgres สำหรับ e2e ของ API และตั้ง `DATABASE_URL` + env อื่นที่ API ต้อง validate (ค่า dummy)
- `.github/pull_request_template.md` มี checklist: ทดสอบแล้ว, มี migration?, เพิ่ม env var?, อัปเดตเอกสาร?

## ขั้นที่ 9 — ตรวจรวม + เอกสาร
1. จาก root รัน `pnpm lint && pnpm typecheck && pnpm test && pnpm build` ต้องผ่านทั้งหมด
2. สร้าง `README.md` ที่ root (ภาษาไทย) อธิบาย: สิ่งที่ต้องติดตั้ง (Node, pnpm, Docker), ขั้นตอน setup ครั้งแรก (install → copy .env.example → db:up → db:migrate → db:seed → dev), port ของแต่ละ service, ลิงก์ไป AGENTS.md และ docs/
3. อัปเดต AGENTS.md หัวข้อ 5 (สถานะ) ให้ติ๊ก "Scaffold monorepo" และแก้คำสั่งในหัวข้อ 3 ถ้ามีอะไรต่างไปจากที่เขียนไว้
4. บันทึกทุกการตัดสินใจที่ต่างจากเอกสาร/ที่เพิ่มเข้ามา ลง docs/DECISIONS.md
5. **ยังไม่ต้อง git commit/push** — สรุปให้ผู้ใช้ตรวจก่อน

## สิ่งที่ต้องรายงานเมื่อจบงาน
- รายการไฟล์/โฟลเดอร์หลักที่สร้าง
- เวอร์ชันของ Node, pnpm, Next.js, NestJS, Expo SDK, Prisma ที่ใช้จริง
- ผลของคำสั่งตรวจสอบแต่ละขั้น (ผ่าน/ไม่ผ่าน) และขั้นที่ข้ามไปพร้อมเหตุผล (เช่น ไม่มี Docker ในเครื่อง)
- สิ่งที่ผู้ใช้ต้องทำต่อเอง (เช่น ตั้งค่า Vercel / DigitalOcean / branch protection)
````

---

## หลังจาก AI ทำเสร็จ — ทีมทำต่อเอง

1. ตรวจผลงาน แล้ว commit แรก + push ขึ้น GitHub
2. GitHub → Settings → Branches → ตั้ง branch protection ให้ `main` (ต้องผ่าน PR + CI)
3. Vercel → Import repo → Root Directory `apps/web` → ใส่ `NEXT_PUBLIC_API_URL`
4. DigitalOcean → สร้าง DB + App/Droplet ตาม `docs/ARCHITECTURE.md` หัวข้อ 6 (หลังตอบ Q1, Q2 ใน DECISIONS.md)
5. Prompt ถัดไป (ยังไม่เขียน): `02-data-model.md`, `03-auth.md`
