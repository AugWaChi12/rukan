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

## Windows: ใช้ Docker ใน WSL แทน Docker Desktop

ถ้า Docker Desktop เปิดไม่ขึ้น (เช่น error `The file cannot be accessed by the system` เรื่องไฟล์ `.sock`) ให้รัน Docker Engine ใน WSL Ubuntu แทน — Supabase จะรันใน Ubuntu ส่วน `pnpm dev` / เว็บ / แอป ยังรันบน Windows และต่อ `127.0.0.1:54321` ได้เหมือนเดิม

ติดตั้งครั้งแรก (PowerShell ที่ root ของ repo):

```bash
wsl --install -d Ubuntu-24.04
```

ตั้งชื่อ user + รหัสผ่านของ Ubuntu ให้เสร็จ แล้ว:

```bash
wsl -d Ubuntu-24.04 -u root -- bash scripts/wsl/install-docker.sh <ชื่อ-user-ใน-ubuntu>
```

```bash
wsl -d Ubuntu-24.04 -- bash scripts/wsl/install-node.sh
```

ใช้งาน — แทน `pnpm db:*` ด้วย `pnpm db:wsl <คำสั่ง supabase>`:

| แทน             | ใช้                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pnpm db:start` | `pnpm db:wsl start`                                                                                                   |
| `pnpm db:stop`  | `pnpm db:wsl stop`                                                                                                    |
| `pnpm db:reset` | `pnpm db:wsl db reset`                                                                                                |
| `pnpm db:test`  | `pnpm db:wsl test db`                                                                                                 |
| `pnpm db:types` | `pnpm db:wsl gen types typescript --local --schema public > packages/shared/src/database.types.ts` แล้ว `pnpm format` |

> ถ้า distro ไม่ได้ชื่อ `Ubuntu-24.04` ให้เรียก `wsl -d <ชื่อ distro> -- bash scripts/wsl/supabase.sh <คำสั่ง>` ตรงๆ

**กัน WSL ดับ:** Windows จะปิด WSL เองเมื่อไม่มีโปรแกรมรันอยู่ข้างใน (ไม่นานหลังคำสั่งล่าสุดจบ) → Supabase ดับตามไปด้วย
อาการคือเว็บ/แอปส่งข้อมูลไม่ได้ (`ERR_CONNECTION_REFUSED` ที่ `127.0.0.1:54321`) ทั้งที่เพิ่งรัน `pnpm db:wsl start` ไป
ระหว่าง dev ให้เปิด terminal แยกหนึ่งแท็บรันคำสั่งนี้ค้างไว้ (ปิดแท็บ / Ctrl+C เมื่อเลิกใช้):

```bash
wsl -d Ubuntu-24.04 -- sleep infinity
```

container ของ Supabase จะ start เองเมื่อ WSL บูต — รอ ~30 วินาทีให้ healthy (เช็คด้วย `pnpm db:wsl status`)

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
| [docs/DATABASE.md](docs/DATABASE.md)         | สร้าง/sync DB บนเครื่อง, โครงสร้าง schema, เพิ่มตาราง           |
| [docs/DECISIONS.md](docs/DECISIONS.md)       | การตัดสินใจที่ทำแล้ว + คำถามที่ยังเปิดอยู่                      |
| [docs/POLICY.md](docs/POLICY.md)             | (ร่าง) ยืนยันตัวตน, กติกาชุมชน, PDPA, การลงโทษ, ความปลอดภัย     |
| [docs/prompts/](docs/prompts/)               | prompt สำเร็จรูปสำหรับสั่ง AI ทำงานแต่ละขั้น                    |
