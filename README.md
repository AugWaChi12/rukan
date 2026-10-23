# stuMatch

แอปสำหรับ match / นัดเจอ — Mobile (Expo) · Web (Next.js) · API (NestJS) · PostgreSQL

Monorepo (pnpm + Turborepo) — รายละเอียดทั้งหมดสำหรับคนและ AI อยู่ใน [AGENTS.md](AGENTS.md)

## สิ่งที่ต้องติดตั้ง

- [Node.js](https://nodejs.org) 22 ขึ้นไป (ดู `.nvmrc`)
- [pnpm](https://pnpm.io) 12 — `npm i -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — สำหรับรัน PostgreSQL บนเครื่อง
- (mobile) แอป **Expo Go** บนมือถือ หรือ Android Emulator / iOS Simulator

## Setup ครั้งแรก

```bash
pnpm install

# copy ไฟล์ env ตัวอย่าง (แล้วแก้ค่าถ้าจำเป็น)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp apps/mobile/.env.example apps/mobile/.env

pnpm db:up        # เปิด PostgreSQL (ต้องเปิด Docker Desktop ก่อน)
pnpm db:migrate   # สร้างตารางตาม migration
pnpm db:seed      # ใส่ข้อมูลทดสอบ
pnpm dev          # รันทุก app
```

| Service            | URL                            |
| ------------------ | ------------------------------ |
| Web                | http://localhost:3000          |
| API                | http://localhost:4000/api/v1   |
| API docs (Swagger) | http://localhost:4000/api/docs |
| Expo (Metro)       | http://localhost:8081          |
| PostgreSQL         | localhost:5432                 |

ทำงานเฉพาะส่วน: `pnpm dev --filter=api` / `--filter=web` / `--filter=mobile`

> ถ้าเปิดแอปบนมือถือจริง ให้แก้ `EXPO_PUBLIC_API_URL` ใน `apps/mobile/.env` เป็น IP ของเครื่อง dev

## ก่อนเปิด Pull Request

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## เอกสาร

| ไฟล์                                         | เนื้อหา                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                       | จุดเริ่มต้นสำหรับทุกคนและ AI: โครงสร้าง, คำสั่ง, กฎเหล็ก, สถานะ |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | สถาปัตยกรรม, env vars, การ deploy                               |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md)   | กฎ git, การตั้งชื่อ, API contract, testing                      |
| [docs/DECISIONS.md](docs/DECISIONS.md)       | การตัดสินใจที่ทำแล้ว + คำถามที่ยังเปิดอยู่                      |
| [docs/prompts/](docs/prompts/)               | prompt สำเร็จรูปสำหรับสั่ง AI ทำงานแต่ละขั้น                    |
