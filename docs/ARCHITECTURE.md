# Architecture — stuMatch

## 1. ภาพรวมระบบ

```
┌──────────────────────┐
│ Mobile (Expo / RN)   │──┐
│ apps/mobile          │  │   HTTPS (REST, JSON)
└──────────────────────┘  │   Authorization: Bearer <JWT>
                          ├────────────────────────────►┌──────────────────────────┐      ┌──────────────┐
┌──────────────────────┐  │                             │ API (NestJS)             │─────►│ PostgreSQL   │
│ Web (Next.js)        │──┘                             │ apps/api                 │Prisma│              │
│ apps/web  @ Vercel   │                                │ @ DigitalOcean (Docker)  │      │ @ DigitalOcean│
└──────────────────────┘                                └──────────────────────────┘      └──────────────┘
        ▲                                                          ▲
        └──────────── import types/zod จาก packages/shared ────────┘
```

| ส่วน | Domain (production, ตัวอย่าง) | หมายเหตุ                                            |
| ---- | ----------------------------- | --------------------------------------------------- |
| Web  | `https://<domain>`            | Vercel จัดการ SSL + CDN ให้                         |
| API  | `https://api.<domain>`        | DigitalOcean, ชี้ DNS มาที่ App Platform / Droplet  |
| DB   | private network เท่านั้น      | ห้ามเปิด public ถ้าไม่จำเป็น, จำกัด trusted sources |

> ยังไม่ได้เลือกชื่อ domain — ดู `docs/DECISIONS.md`

---

## 2. หน้าที่ของแต่ละส่วน

### `apps/api` — NestJS (แหล่งความจริงเดียวของ business logic)

- เป็นที่เดียวที่ต่อ database และถือ secret
- REST API, prefix ทุก route ด้วย `/api/v1`
- โครงสร้างแบบ feature module: `src/modules/<feature>/{<feature>.module.ts, .controller.ts, .service.ts, dto/}`
- เป็น **ESM** (`"type": "module"`, NestJS 12) — import ไฟล์ในโปรเจคต้องลงท้าย `.js`
- Validation: ใช้ zod schema จาก `packages/shared` ผ่าน `ZodValidationPipe` (`src/common/pipes/`) เพื่อให้ client กับ server ใช้กฎเดียวกัน
- การตั้งค่า app (prefix, helmet, CORS, filter, Swagger) อยู่ที่ `src/app.setup.ts` ที่เดียว — e2e test เรียกฟังก์ชันเดียวกัน
- Rate limit: `@nestjs/throttler` 100 req/นาที/IP (health ยกเว้น)
- เอกสาร API: Swagger ที่ `/api/docs` (ปิดอัตโนมัติเมื่อ `NODE_ENV=production`)
- Health check: `GET /api/v1/health` → `{ status: "ok", database: "up", timestamp }` ถ้าต่อ DB ไม่ได้ตอบ **503** + `status: "error"` (ใช้กับ DigitalOcean health check)
- Error format มาตรฐาน (ผ่าน global exception filter):
  ```json
  { "statusCode": 400, "error": "Bad Request", "message": "...", "details": [] }
  ```
- Realtime (อนาคต เช่น แชท/แจ้งเตือน): ใช้ NestJS WebSocket Gateway (Socket.IO) — เป็นเหตุผลหลักที่ API **ไม่** ไปอยู่บน Vercel (serverless ไม่รองรับ WebSocket ค้างการเชื่อมต่อ)

### `apps/web` — Next.js @ Vercel

- App Router (`src/app`)
- เรียก API ผ่าน client กลางใน `src/lib/api.ts` (base URL จาก `NEXT_PUBLIC_API_URL`)
- ไม่มี database / secret ของตัวเอง ถ้าต้องใช้ secret ให้ทำผ่าน API หรือ Route Handler ฝั่ง server เท่านั้น
- Vercel ตั้ง **Root Directory = `apps/web`** และเปิด "Include files outside the root directory" เพื่อให้ใช้ `packages/shared` ได้
- ทุก Pull Request ได้ Preview URL อัตโนมัติ

### `apps/mobile` — Expo

- ใช้ `expo-router` (file-based routing ใน `src/app/`)
- config ของแอปอยู่ใน `app.config.ts` (bundle id `com.stumatch.app`, scheme `stumatch`)
- เรียก API ผ่าน `src/lib/api.ts` (base URL จาก `EXPO_PUBLIC_API_URL`)
- เก็บ token ด้วย `expo-secure-store` (ห้ามใช้ AsyncStorage สำหรับ token)
- Build/ส่ง store ด้วย EAS (`eas build`, `eas submit`)

### `packages/shared`

- สิ่งที่อยู่ที่นี่: zod schemas, TypeScript types ที่ derive จาก zod (`z.infer`), enum/constants, API route constants
- สิ่งที่ **ห้าม** อยู่ที่นี่: โค้ดที่ใช้ Node-only API, React component, Prisma client, secret
- Build ด้วย `tsup` ออกทั้ง ESM + CJS + `.d.ts` (ทุก app ตอนนี้เป็น ESM แต่เก็บ CJS ไว้เผื่อ tool ที่ยัง `require`)
- ชื่อ package: `@stumatch/shared`

### `packages/tsconfig` / `packages/eslint-config`

- `@stumatch/tsconfig`: `base.json`, `nestjs.json`, `nextjs.json` (shared, api, web extends) — mobile ใช้ `expo/tsconfig.base` ตามที่ Expo แนะนำ
- `@stumatch/eslint-config`: flat config กลาง (shared, api ใช้) — web ใช้ `eslint-config-next`, mobile ใช้ `eslint-config-expo`

---

## 3. Database

- PostgreSQL, จัดการ schema ด้วย **Prisma** (`apps/api/prisma/schema.prisma`)
- ตอน dev: รันผ่าน `infra/docker-compose.yml` (image `postgres:18-alpine`)
- **Prisma 7**: ต่อ DB ผ่าน driver adapter `@prisma/adapter-pg`, URL อยู่ใน `apps/api/prisma.config.ts` (อ่านจาก `DATABASE_URL`), client generate ไปที่ `apps/api/src/generated/prisma` (ไม่ commit — `build`/`typecheck` generate ให้อัตโนมัติ)
- ตาราง: ชื่อ model เป็น PascalCase เอกพจน์ (`User`), map เป็น snake_case พหูพจน์ใน DB (`@@map("users")`), column เป็น snake_case (`@map("created_at")`)
- ทุกตารางมี `id` (uuid หรือ cuid), `createdAt`, `updatedAt`
- Migration: `prisma migrate dev` ตอน dev, `prisma migrate deploy` ตอน deploy (รันก่อน start API)
- Seed: `apps/api/prisma/seed.ts` สำหรับข้อมูลทดสอบ

---

## 4. Authentication (แผนตั้งต้น — ยืนยันใน DECISIONS.md)

- API ออก **JWT access token** (อายุสั้น เช่น 15 นาที) + **refresh token** (อายุยาว เก็บ hash ใน DB เพื่อ revoke ได้)
- Web: เก็บ token ใน httpOnly cookie (ผ่าน Next.js Route Handler) หรือ memory + refresh
- Mobile: เก็บใน `expo-secure-store`
- รหัสผ่าน hash ด้วย `argon2` (หรือ `bcrypt`)
- Social login (Google/Apple) — ยังไม่ตัดสินใจ

---

## 5. Environment Variables

| App    | ไฟล์ตอน dev             | ตัวแปร                                                                                                                                    | Public?               |
| ------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| api    | `apps/api/.env`         | `DATABASE_URL`, `PORT=4000`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `CORS_ORIGINS` | ❌ secret             |
| web    | `apps/web/.env.local`   | `NEXT_PUBLIC_API_URL`                                                                                                                     | ✅                    |
| mobile | `apps/mobile/.env`      | `EXPO_PUBLIC_API_URL`                                                                                                                     | ✅                    |
| infra  | `infra/.env` (optional) | `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`                                                                                       | ❌ (ค่า dev เท่านั้น) |

ที่เก็บค่าจริงของแต่ละ environment:

| Environment | web                                              | api                                |
| ----------- | ------------------------------------------------ | ---------------------------------- |
| Local dev   | `.env.local` บนเครื่อง (copy จาก `.env.example`) | `.env` บนเครื่อง                   |
| Preview     | Vercel Env (Preview)                             | — (ชี้ไป staging API ถ้ามี)        |
| Production  | Vercel Env (Production)                          | DigitalOcean App env / Droplet env |

ถ้าต้องการคุม key ที่เดียว: ใช้ **Infisical** (หรือ Doppler) เป็น source of truth แล้ว sync ไป Vercel + DigitalOcean + GitHub Actions

API ต้อง **validate env ตอน start** (zod) ถ้าตัวแปรขาด → crash ทันทีพร้อมข้อความบอกว่าขาดตัวไหน

---

## 6. Deploy

### Web → Vercel

- Import repo จาก GitHub, Framework = Next.js, Root Directory = `apps/web`
- Build command ปล่อยให้ Vercel ตรวจจับ Turborepo เอง (หรือ `cd ../.. && pnpm turbo build --filter=web`)
- Ignored Build Step: ใช้ `npx turbo-ignore` เพื่อไม่ build เมื่อ web ไม่ได้เปลี่ยน
- Merge เข้า `main` → Production, PR → Preview

### API → DigitalOcean

- `apps/api/Dockerfile` (multi-stage, build จาก **root ของ repo** เพราะต้องใช้ `packages/shared`)
  - ใช้ `turbo prune api --docker` เพื่อตัดเฉพาะ package ที่ API ใช้
- ใช้ Dockerfile เดียวกันได้ทั้ง 2 แบบ:
  - **App Platform**: เชื่อม GitHub, source dir = root, Dockerfile path = `apps/api/Dockerfile`, auto deploy เมื่อ push `main`
  - **Droplet**: `docker compose` + reverse proxy (Caddy/nginx) + SSL
- Start command (อยู่ใน CMD ของ Dockerfile แล้ว): `prisma migrate deploy && node dist/main.js`
- Health check path: `/api/v1/health`

### Mobile → EAS

- `eas.json` มี profile `development`, `preview`, `production`
- `EXPO_PUBLIC_API_URL` ตั้งตาม profile

---

## 7. CI (GitHub Actions)

`.github/workflows/ci.yml` — รันทุก PR และ push เข้า `main`:

1. checkout → setup pnpm + Node (ตาม `.nvmrc`) → `pnpm install --frozen-lockfile`
2. `pnpm turbo lint typecheck test build` (Turborepo จะรันเฉพาะส่วนที่เปลี่ยน)
3. API e2e test ใช้ PostgreSQL service container

Deploy ไม่ทำใน CI — Vercel และ DigitalOcean deploy เองผ่าน Git integration
