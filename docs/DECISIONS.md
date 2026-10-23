# Decisions — บันทึกการตัดสินใจ

> บันทึกว่า "เลือกอะไร เพราะอะไร" เพื่อให้คน/AI ที่มาทีหลังไม่ต้องถกเรื่องเดิมซ้ำ
> รูปแบบ: เพิ่มรายการใหม่ไว้ล่างสุดของแต่ละหมวด พร้อมวันที่ (YYYY-MM-DD)

## ✅ ตัดสินใจแล้ว

| #   | วันที่     | เรื่อง            | เลือก                                                               | เหตุผล                                                                                                  |
| --- | ---------- | ----------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| D1  | 2026-10-23 | Mobile            | React Native + **Expo**                                             | ทีมใช้ TypeScript/React อยู่แล้ว, Expo ช่วยเรื่อง build (EAS) และ monorepo                              |
| D2  | 2026-10-23 | Web               | **Next.js** (App Router)                                            | deploy บน Vercel ได้ดีที่สุด, เพื่อนมี Vercel Pro                                                       |
| D3  | 2026-10-23 | API               | **NestJS**                                                          | โครงสร้างชัด (module/DI), TypeScript เต็มตัว, รองรับ WebSocket                                          |
| D4  | 2026-10-23 | Database          | **PostgreSQL**                                                      | relational เหมาะกับข้อมูล user/match/นัด                                                                |
| D5  | 2026-10-23 | Repo              | **Monorepo** (pnpm workspaces + Turborepo)                          | ทีมเล็ก, ทุกส่วนเป็น TypeScript → แชร์ type ได้, แก้ API + client ใน PR เดียว                           |
| D6  | 2026-10-23 | Hosting web       | **Vercel Pro**                                                      | Preview URL ทุก PR, จัดการ SSL/CDN ให้                                                                  |
| D7  | 2026-10-23 | Hosting API + DB  | **DigitalOcean**                                                    | API ต้องเป็น server ที่รันค้าง (WebSocket ในอนาคต) ซึ่ง Vercel serverless ไม่เหมาะ                      |
| D8  | 2026-10-23 | Secrets           | ห้ามอยู่ใน git, secret จริงอยู่ที่ API เท่านั้น                     | repo เป็น public, โค้ด client ถูกอ่านได้เสมอ                                                            |
| D9  | 2026-10-23 | Git flow          | `main` + `feature/*` + PR + squash merge                            | เรียบง่ายพอสำหรับทีมเล็ก                                                                                |
| D10 | 2026-10-23 | TypeScript        | **~6.0** (ไม่ใช้ 7.0 ที่เป็น latest)                                | typescript-eslint 8.x รองรับแค่ `<6.1`, Nest CLI 12 ผูกกับ TS 6                                         |
| D11 | 2026-10-23 | Prisma            | **7.10.1** (ไม่ใช้ 8.0 ที่เป็น RC)                                  | ใช้เวอร์ชัน stable เท่านั้น                                                                             |
| D12 | 2026-10-23 | ESLint            | **9** ทั้ง repo                                                     | ปลั๊กอินใน eslint-config-next (import, react, jsx-a11y) ยังไม่รองรับ ESLint 10                          |
| D13 | 2026-10-23 | pnpm settings     | อยู่ใน `pnpm-workspace.yaml` (ไม่ใช่ `.npmrc`)                      | pnpm 12 ไม่อ่าน setting จาก `.npmrc` แล้ว; `allowBuilds` อนุญาตเฉพาะ esbuild, argon2, prisma, @swc/core |
| D14 | 2026-10-23 | API module system | **ESM** + **Vitest**                                                | เป็น default ของ NestJS 12 (`nest new`)                                                                 |
| D15 | 2026-10-23 | API lint          | ใช้ ESLint (`@stumatch/eslint-config`) แทน oxlint ที่ Nest 12 ให้มา | ให้ทั้ง repo ใช้ tool เดียวกัน                                                                          |
| D16 | 2026-10-23 | Password hashing  | **argon2**                                                          | แนะนำโดย OWASP, ใช้ใน seed แล้ว                                                                         |
| D17 | 2026-10-23 | Mobile config     | `app.config.ts` + tsconfig ของ Expo (`expo/tsconfig.base`)          | ใช้ TS ได้ + ตามที่ Expo แนะนำ; ไม่ extends `@stumatch/tsconfig`                                        |
| D18 | 2026-10-23 | Migration แรก     | สร้างด้วย `prisma migrate diff --from-empty` (ไม่ใช่ `migrate dev`) | ตอน scaffold ไม่มี Docker — ผลลัพธ์ SQL เหมือนกัน                                                       |

## 🟡 Default ชั่วคราว (ใช้ไปก่อน ทีมยังไม่ยืนยัน)

> AI: ใช้ค่าเหล่านี้ได้เลยถ้าไม่มีคำสั่งอื่น แต่ให้ออกแบบให้เปลี่ยนทีหลังได้ง่าย

| #   | เรื่อง                      | Default                                                  | ทางเลือกอื่น                                                           |
| --- | --------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| T1  | ORM                         | **Prisma**                                               | TypeORM, Drizzle                                                       |
| T2  | วิธีรัน API บน DigitalOcean | ทำ **Dockerfile** ที่ใช้ได้ทั้ง App Platform และ Droplet | —                                                                      |
| T3  | Auth                        | Email + password, JWT access + refresh token             | Social login (Google/Apple), Firebase Auth, Clerk                      |
| T4  | Validation                  | **zod** schema ใน `packages/shared`                      | class-validator (NestJS default)                                       |
| T5  | Package manager             | **pnpm**                                                 | npm, yarn                                                              |
| T6  | Node version                | Node 22 (ตามเครื่องที่ scaffold)                         | Node 24 LTS — ถ้าเปลี่ยนให้แก้ `.nvmrc` + `NODE_VERSION` ใน Dockerfile |
| T7  | Web styling                 | Tailwind CSS                                             | CSS Modules                                                            |
| T8  | Mobile styling              | NativeWind หรือ StyleSheet ปกติ                          | Tamagui                                                                |
| T9  | Data fetching (web/mobile)  | TanStack Query                                           | SWR                                                                    |

## ❓ Open questions (ต้องให้ทีมตัดสินใจ)

| #   | คำถาม                                                                       | หมายเหตุ                                                  |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------- |
| Q1  | DigitalOcean: App Platform หรือ Droplet + Docker?                           | App Platform ง่ายกว่า, Droplet ถูกกว่า/คุมเองได้          |
| Q2  | DB: Managed PostgreSQL (~$15/เดือน, มี backup) หรือรันใน Docker เอง?        | ถ้ามีผู้ใช้จริงแนะนำ Managed                              |
| Q3  | GitHub repo อยู่ที่ไหน? `AugWaChi12/match` เดิม หรือสร้าง Organization ใหม่ | Org ดีกว่าในระยะยาว                                       |
| Q4  | ชื่อ domain                                                                 | ใช้กับ `<domain>` และ `api.<domain>`                      |
| Q5  | Vercel Pro: สมาชิกทีมที่ push โค้ดต้องมี seat หรือไม่                       | เช็คการตั้งค่า team ของเพื่อนที่มี Pro                    |
| Q6  | รูปแบบการ login                                                             | ดู T3                                                     |
| Q7  | เก็บรูปโปรไฟล์ที่ไหน                                                        | DigitalOcean Spaces หรือ Vercel Blob                      |
| Q8  | ใช้ Infisical/Doppler คุม secret ที่เดียวหรือไม่                            | ถ้าไม่ใช้ ให้เก็บแยกใน Vercel + DO                        |
| Q9  | ขอบเขตฟีเจอร์ของ MVP                                                        | match แบบไหน (1:1, กลุ่ม, กิจกรรม), นัดเวลา/สถานที่, แชท? |
