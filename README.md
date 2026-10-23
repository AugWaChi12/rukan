# รู้กัน (rukan)

แอปสำหรับ match / นัดเจอ — Mobile (Expo) · Web (Next.js) · Backend (Supabase)

Monorepo (pnpm + Turborepo) — รายละเอียดทั้งหมดสำหรับคนและ AI อยู่ใน [AGENTS.md](AGENTS.md)

## สิ่งที่ต้องติดตั้ง

- [Node.js](https://nodejs.org) 22 ขึ้นไป (ดู `.nvmrc`)
- [pnpm](https://pnpm.io) 12 — `npm i -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — Supabase บนเครื่องรันใน Docker
- (mobile) แอป **Expo Go** บนมือถือ หรือ Android Emulator / iOS Simulator

Supabase CLI ติดตั้งมากับ `pnpm install` ไม่ต้องติดตั้งแยก

## Setup ครั้งแรก

```bash
pnpm install
pnpm db:start     # เปิด Supabase บนเครื่อง (ครั้งแรกโหลด image นานหน่อย) — สร้างตาราง + ข้อมูลทดสอบให้เลย
pnpm db:status    # copy "Publishable key" ไปใส่ใน .env ด้านล่าง

cp apps/web/.env.example apps/web/.env.local     # ใส่ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
cp apps/mobile/.env.example apps/mobile/.env     # ใส่ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

pnpm dev          # รันทุก app
```

| Service                        | URL                    |
| ------------------------------ | ---------------------- |
| Web                            | http://localhost:3000  |
| Supabase Studio (ดู/แก้ข้อมูล) | http://127.0.0.1:54323 |
| Supabase API                   | http://127.0.0.1:54321 |
| Mailpit (อีเมลจาก Auth)        | http://127.0.0.1:54324 |
| Expo (Metro)                   | http://localhost:8081  |

ผู้ใช้ทดสอบ: `demo@rukan.dev` / `password123`

ทำงานเฉพาะส่วน: `pnpm dev --filter=web` / `--filter=mobile`

> ถ้าเปิดแอปบนมือถือจริง ให้แก้ `EXPO_PUBLIC_SUPABASE_URL` ใน `apps/mobile/.env` เป็น IP ของเครื่อง dev เช่น `http://192.168.1.10:54321`

## แก้ database

```bash
pnpm db:migration add_something   # สร้างไฟล์ใน supabase/migrations แล้วเขียน SQL (ตาราง + RLS)
pnpm db:reset                     # apply ใหม่ทั้งหมด + seed
pnpm db:test                      # รัน RLS tests
pnpm db:types                     # อัปเดต type ใน packages/shared
```

## ก่อนเปิด Pull Request

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm db:test   # ถ้าแก้ supabase/
```

## เอกสาร

| ไฟล์                                         | เนื้อหา                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                       | จุดเริ่มต้นสำหรับทุกคนและ AI: โครงสร้าง, คำสั่ง, กฎเหล็ก, สถานะ |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | สถาปัตยกรรม, RLS, auth, env vars, การ deploy                    |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md)   | กฎ git, การตั้งชื่อ, การเขียน migration/RLS, testing            |
| [docs/DECISIONS.md](docs/DECISIONS.md)       | การตัดสินใจที่ทำแล้ว + คำถามที่ยังเปิดอยู่                      |
| [docs/POLICY.md](docs/POLICY.md)             | (ร่าง) ยืนยันตัวตน, กติกาชุมชน, PDPA, การลงโทษ, ความปลอดภัย     |
| [docs/prompts/](docs/prompts/)               | prompt สำเร็จรูปสำหรับสั่ง AI ทำงานแต่ละขั้น                    |
