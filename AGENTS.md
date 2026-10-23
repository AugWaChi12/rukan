# AGENTS.md — คู่มือสำหรับ AI / Developer ที่เข้ามาทำงานในโปรเจคนี้

> ไฟล์นี้คือ "จุดเริ่มต้น" ของทุกคน (ทั้งคนและ AI) ที่เข้ามาแตะโปรเจค **stuMatch**
> อ่านไฟล์นี้ให้จบก่อนแก้โค้ดใดๆ แล้วค่อยไปอ่านเอกสารใน `docs/` ตามลิงก์ด้านล่าง

---

## 1. โปรเจคนี้คืออะไร

**stuMatch** คือแอปสำหรับ "match / นัดเจอ / รวมกลุ่ม" ระหว่างผู้ใช้
มี 3 ช่องทางใช้งาน (client) ที่คุยกับ backend ตัวเดียวกัน:

| ส่วน           | เทคโนโลยี                             | โฟลเดอร์                         | Deploy ที่                            |
| -------------- | ------------------------------------- | -------------------------------- | ------------------------------------- |
| Mobile app     | React Native (**Expo**) + TypeScript  | `apps/mobile`                    | App Store / Play Store ผ่าน EAS Build |
| Web app        | **Next.js** (App Router) + TypeScript | `apps/web`                       | **Vercel** (Pro plan ของทีม)          |
| API            | **NestJS** + TypeScript               | `apps/api`                       | **DigitalOcean** (Docker)             |
| Database       | **PostgreSQL** + **Prisma** ORM       | schema อยู่ที่ `apps/api/prisma` | DigitalOcean (Managed DB หรือ Docker) |
| โค้ดที่ใช้ร่วม | TypeScript types + Zod schemas        | `packages/shared`                | — (เป็น library ภายใน)                |

รายละเอียดสถาปัตยกรรม → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## 2. โครงสร้าง Repo (Monorepo: pnpm workspaces + Turborepo)

```
stuMatch/
├── AGENTS.md                 ← ไฟล์นี้ (context หลักสำหรับ AI ทุกตัว)
├── CLAUDE.md                 ← ชี้มาที่ AGENTS.md (สำหรับ Claude Code)
├── README.md                 ← วิธีเริ่มต้นสำหรับคน
├── package.json              ← root: scripts รวม + devDependencies กลาง
├── pnpm-workspace.yaml       ← ประกาศ workspace + nodeLinker: hoisted + allowBuilds
├── turbo.json                ← pipeline: dev / build / lint / typecheck / test
├── .gitignore
├── .editorconfig / .prettierrc
├── .nvmrc                    ← เวอร์ชัน Node ที่ทีมใช้
├── .dockerignore             ← ใช้ตอน build image ของ API (context = root)
├── apps/
│   ├── api/                  ← NestJS (ESM, "type": "module")
│   │   ├── prisma/           ← schema.prisma + migrations/ + seed.ts
│   │   ├── prisma.config.ts  ← config ของ Prisma 7 (DATABASE_URL, seed command)
│   │   ├── src/
│   │   │   ├── main.ts       ← bootstrap
│   │   │   ├── app.setup.ts  ← prefix, helmet, CORS, error filter, Swagger (ใช้ร่วมกับ e2e test)
│   │   │   ├── app.module.ts
│   │   │   ├── config/       ← env.ts: zod schema + validate env ตอน start
│   │   │   ├── prisma/       ← PrismaService / PrismaModule (global)
│   │   │   ├── common/       ← filters/ (AllExceptionsFilter), pipes/ (ZodValidationPipe)
│   │   │   ├── modules/      ← 1 feature = 1 โฟลเดอร์ (ตอนนี้มี health)
│   │   │   └── generated/    ← Prisma Client (generate อัตโนมัติ, ไม่ commit)
│   │   ├── test/             ← e2e tests (ต้องมี DB)
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── web/                  ← Next.js 16
│   │   ├── src/app/          ← App Router
│   │   ├── src/components/
│   │   ├── src/lib/api.ts    ← fetch wrapper กลาง
│   │   ├── AGENTS.md         ← กฎของ Next.js เอง (Next สร้างให้ — อ่านก่อนแก้ web)
│   │   └── .env.example
│   └── mobile/               ← Expo SDK 58 (expo-router)
│       ├── src/app/          ← หน้าจอ (file-based routing)
│       ├── src/components/
│       ├── src/lib/api.ts    ← fetch wrapper กลาง
│       ├── app.config.ts     ← config ของแอป (แทน app.json)
│       ├── eas.json          ← profile ของ EAS Build
│       ├── AGENTS.md         ← กฎของ Expo เอง (Expo สร้างให้ — อ่านก่อนแก้ mobile)
│       └── .env.example
├── packages/
│   ├── shared/               ← @stumatch/shared: zod schemas / types / constants ที่ใช้ร่วม
│   ├── tsconfig/             ← @stumatch/tsconfig: base / nestjs / nextjs
│   └── eslint-config/        ← @stumatch/eslint-config: flat config กลาง (shared + api ใช้)
├── infra/
│   └── docker-compose.yml    ← PostgreSQL 18 สำหรับ dev บนเครื่อง
├── docs/
│   ├── ARCHITECTURE.md       ← ภาพรวมระบบ, การไหลของข้อมูล, deploy
│   ├── CONVENTIONS.md        ← กฎการเขียนโค้ด, git, env, การตั้งชื่อ
│   ├── DECISIONS.md          ← บันทึกการตัดสินใจ + เรื่องที่ยังเปิดอยู่
│   └── prompts/              ← prompt สำเร็จรูปสำหรับสั่ง AI ทำงานแต่ละขั้น
└── .github/workflows/        ← CI (lint, typecheck, test, build)
```

---

## 3. คำสั่งที่ใช้บ่อย (รันจาก root)

```bash
pnpm install                     # ติดตั้งทุก package
pnpm db:up                       # เปิด PostgreSQL ใน Docker (infra/docker-compose.yml)
pnpm db:migrate                  # prisma migrate dev (สร้าง/apply migration)
pnpm db:seed                     # ใส่ข้อมูลทดสอบ (demo@stumatch.dev / password123)
pnpm db:studio                   # เปิด Prisma Studio
pnpm db:down                     # ปิด PostgreSQL
pnpm dev                         # รันทุก app พร้อมกัน
pnpm dev --filter=api            # รันเฉพาะ API
pnpm dev --filter=web            # รันเฉพาะ web
pnpm dev --filter=mobile         # รันเฉพาะ mobile (Expo)
pnpm lint | pnpm typecheck | pnpm test | pnpm build
pnpm --filter api test:e2e       # e2e ของ API (ต้อง db:up ก่อน)
pnpm format                      # จัด format ทั้ง repo ด้วย Prettier
```

เพิ่ม package ใน app ไหน ให้ `cd apps/<app>` แล้ว `pnpm add <pkg>`
(**mobile ให้ใช้ `npx expo install <pkg>`** เพื่อได้เวอร์ชันที่เข้ากับ Expo SDK)

Port มาตรฐานตอน dev:

| Service            | URL                            |
| ------------------ | ------------------------------ |
| Web                | http://localhost:3000          |
| API                | http://localhost:4000/api/v1   |
| API docs (Swagger) | http://localhost:4000/api/docs |
| PostgreSQL         | localhost:5432                 |

> Mobile บนมือถือจริง/emulator เรียก `localhost` ไม่ได้ ต้องใช้ IP เครื่อง dev (เช่น `http://192.168.1.10:4000/api/v1`)
> หรือ Android emulator ใช้ `http://10.0.2.2:4000/api/v1`

---

## 4. กฎเหล็ก (ห้ามฝ่าฝืน)

1. **ห้าม commit secret/key ใดๆ** — repo เป็น **Public** บน GitHub
   - ไฟล์ `.env`, `.env.local`, `.env.*.local` ต้องอยู่ใน `.gitignore` เสมอ
   - เพิ่มตัวแปรใหม่ → เพิ่มชื่อ (ไม่ใส่ค่าจริง) ใน `.env.example` ของ app นั้นทุกครั้ง
2. **Secret จริงอยู่ที่ `apps/api` เท่านั้น** — โค้ดใน `apps/web` (ฝั่ง browser) และ `apps/mobile` ถือว่าเป็นสาธารณะ
   - ตัวแปรที่ขึ้นต้น `NEXT_PUBLIC_` / `EXPO_PUBLIC_` จะถูกฝังลงใน client → ใส่ได้เฉพาะค่าที่เปิดเผยได้ (เช่น URL ของ API)
3. **Client ห้ามต่อ database ตรง** — ทุกอย่างผ่าน API (`apps/api`) เท่านั้น
4. **Type ที่ใช้ข้าม app ต้องอยู่ใน `packages/shared`** — ห้าม copy type ไปวางซ้ำใน app
   - ห้าม export type ของ Prisma ออกไปให้ client ใช้ตรงๆ ให้แปลงเป็น DTO ใน `packages/shared`
5. **เปลี่ยน database schema → ต้องมี Prisma migration** (`prisma migrate dev --name <ชื่อ>`) ห้ามแก้ DB มือ
6. **ห้าม push ตรงเข้า `main`** — ทำผ่าน branch + Pull Request เสมอ
7. ก่อนบอกว่างานเสร็จ ต้องผ่าน `pnpm lint && pnpm typecheck && pnpm test` อย่างน้อยใน app ที่แก้

รายละเอียดกฎทั้งหมด → [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)

---

## 5. สถานะปัจจุบันของโปรเจค

- [x] ตกลง tech stack และโครงสร้าง monorepo
- [x] เขียนเอกสาร AGENTS.md / docs/
- [x] Scaffold monorepo (2026-10-23, ตาม [`docs/prompts/01-scaffold-monorepo.md`](docs/prompts/01-scaffold-monorepo.md))
  - [ ] ยังไม่ได้ทดสอบกับ DB จริง: `pnpm db:up`, `db:migrate`, `db:seed`, `test:e2e` และ `docker build` ของ API (เครื่องที่ scaffold เปิด Docker ไม่ขึ้น)
- [x] push ขึ้น GitHub: https://github.com/AugWaChi12/stuMatch (2026-10-23)
- [ ] ตั้ง branch protection ให้ `main` + เช็คว่า CI บน GitHub ผ่าน
- [ ] ออกแบบ data model (User, Profile, Match, Event ฯลฯ)
- [ ] ระบบ Auth
- [ ] Deploy web ขึ้น Vercel / API ขึ้น DigitalOcean

> **AI ที่ทำงานเสร็จแต่ละขั้น: อัปเดต checklist นี้ และบันทึกการตัดสินใจใหม่ลง `docs/DECISIONS.md` ด้วย**

เรื่องที่ทีมยังไม่ได้ตัดสินใจ (อย่าเดาเอง ให้ถามทีม หรือใช้ค่า default ที่ระบุไว้) → ดูหัวข้อ "Open questions" ใน [`docs/DECISIONS.md`](docs/DECISIONS.md)

---

## 6. วิธีทำงานสำหรับ AI

- อ่าน `AGENTS.md` → `docs/ARCHITECTURE.md` → `docs/CONVENTIONS.md` → `docs/DECISIONS.md` ก่อนเริ่ม
- ทำงานทีละ app ตาม scope ที่ได้รับ ถ้าต้องแก้ข้าม app (เช่น เพิ่ม endpoint + หน้าจอ) ให้แก้ `packages/shared` ก่อน แล้วค่อย API แล้วค่อย client
- ใช้เวอร์ชัน stable ล่าสุดของ library ณ วันที่ทำงาน และเช็คเอกสารทางการถ้าไม่แน่ใจ (API ของ Next.js / Expo / Prisma เปลี่ยนบ่อย)
- อย่าเพิ่ม library ใหม่ถ้าของที่มีอยู่ทำได้แล้ว ถ้าจำเป็นต้องเพิ่ม ให้บันทึกเหตุผลใน `docs/DECISIONS.md`
- สรุปสิ่งที่ทำ + สิ่งที่ยังไม่ได้ทำ/ไม่ได้ทดสอบ ให้ชัดเจนเมื่อจบงาน

---

## 7. เวอร์ชันที่ใช้ + จุดที่ต้องระวัง (ณ วันที่ scaffold 2026-10-23)

| เครื่องมือ | เวอร์ชัน                                                               |
| ---------- | ---------------------------------------------------------------------- |
| Node       | 22 (`.nvmrc`)                                                          |
| pnpm       | 12.15 (`packageManager` ใน package.json)                               |
| TypeScript | ~6.0 (**ไม่ใช่ 7** — typescript-eslint และ Nest CLI ยังไม่รองรับ TS 7) |
| Turborepo  | 2.11                                                                   |
| NestJS     | 12                                                                     |
| Prisma     | 7.10 (ไม่ใช้ 8 เพราะยังเป็น RC)                                        |
| Next.js    | 16.4                                                                   |
| Expo SDK   | 58 (React Native 0.88, React 19.3)                                     |
| zod        | 4                                                                      |
| ESLint     | 9 (eslint-config-next ยังไม่รองรับ 10)                                 |

จุดที่มักพลาด:

- **pnpm 12 ไม่อ่าน setting จาก `.npmrc`** (ยกเว้น auth) — setting อยู่ใน `pnpm-workspace.yaml`
  - package ที่มี install script ต้องอนุญาตใน `allowBuilds` ไม่งั้น `pnpm add` จะ error `ERR_PNPM_IGNORED_BUILDS`
- **NestJS 12 เป็น ESM** — import ไฟล์ในโปรเจคต้องลงท้าย `.js` เช่น `import { X } from './x.js'`
- **Prisma 7**: ต้องใช้ driver adapter (`@prisma/adapter-pg`), client generate ไปที่ `apps/api/src/generated/prisma` (import จาก `../generated/prisma/client.js`), URL ของ DB ตั้งใน `prisma.config.ts`
- `packages/shared` ต้อง build ก่อน app อื่นจะเห็น type ใหม่ — `pnpm dev` ของ turbo build ให้ตอนเริ่ม ถ้าแก้ shared ระหว่าง dev ให้รัน `pnpm --filter @stumatch/shared dev` (tsup watch) คู่กันไป
- Unit test ของ API ใช้ **Vitest** (Nest 12 default) ไม่ใช่ Jest
