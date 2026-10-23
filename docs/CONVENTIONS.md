# Conventions — กฎการทำงานร่วมกัน

## 1. Git

### Branch

- `main` = โค้ดที่พร้อม deploy เสมอ (ล็อกด้วย branch protection: ต้องผ่าน PR + CI)
- แตก branch จาก `main` ตามรูปแบบ:

| ประเภท           | รูปแบบ                    | ตัวอย่าง                     |
| ---------------- | ------------------------- | ---------------------------- |
| ฟีเจอร์ใหม่      | `feature/<scope>-<สั้นๆ>` | `feature/db-match-requests`  |
| แก้บั๊ก          | `fix/<scope>-<สั้นๆ>`     | `fix/mobile-crash-on-logout` |
| งานจุกจิก/config | `chore/<สั้นๆ>`           | `chore/update-deps`          |
| เอกสาร           | `docs/<สั้นๆ>`            | `docs/architecture-auth`     |

`<scope>` = `db` (supabase/) | `web` | `mobile` | `shared` | `repo`

### Commit message (Conventional Commits)

```
<type>(<scope>): <สรุปสั้นๆ>

feat(db): add match_requests table with RLS
fix(mobile): handle expired session on startup
chore(repo): add turbo pipeline for typecheck
docs: describe supabase deploy flow
```

`type` = `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `style` | `perf`

### Pull Request

- 1 PR = 1 เรื่อง, เล็กพอให้ review ได้ใน 15 นาที
- ต้องมีเพื่อน approve อย่างน้อย 1 คน + CI เขียว ก่อน merge
- ใช้ **Squash merge** เข้า `main`
- ถ้าเปลี่ยน DB schema ให้เขียนใน PR ว่ามี migration อะไร + RLS policy อะไร — หลัง merge ต้องมีคน `supabase db push`
- ถ้าเพิ่ม env var ให้เขียนใน PR + อัปเดต `.env.example` + แจ้งทีมให้ตั้งค่าใน Vercel / EAS

## 2. TypeScript / โค้ด

- `strict: true` ทุก app
- ห้ามใช้ `any` (ถ้าจำเป็นจริงๆ ใช้ `unknown` แล้ว narrow)
- Format: Prettier (config กลางที่ root), Lint: ESLint
- Import ข้าม package ใช้ชื่อ package เช่น `import { UserDto } from '@rukan/shared'` ห้ามใช้ relative path ข้าม app (`../../packages/...`)

### การตั้งชื่อ

| สิ่ง                 | รูปแบบ                         | ตัวอย่าง                               |
| -------------------- | ------------------------------ | -------------------------------------- |
| ไฟล์ทั่วไป           | kebab-case                     | `match-card.tsx`, `use-profile.ts`     |
| React component      | PascalCase (ชื่อ export)       | `export function MatchCard()`          |
| ตัวแปร/ฟังก์ชัน      | camelCase                      | `getProfileById`                       |
| Type / Interface     | PascalCase                     | `Profile`, `MatchRequest`              |
| Constant             | UPPER_SNAKE_CASE               | `MAX_GROUP_SIZE`                       |
| Zod schema           | camelCase + `Schema`           | `createMatchSchema`                    |
| Env var              | UPPER_SNAKE_CASE               | `NEXT_PUBLIC_SUPABASE_URL`             |
| DB table             | snake_case, พหูพจน์            | `match_requests`                       |
| DB column / function | snake_case                     | `created_at`, `accept_match()`         |
| RLS policy           | `"<ตาราง>: <ใครทำอะไรได้>"`    | `"profiles: แก้ได้เฉพาะโปรไฟล์ตัวเอง"` |
| Migration file       | สร้างด้วย CLI, ชื่อ snake_case | `20261023033015_init_profiles.sql`     |

## 3. Database / Supabase

### เขียน migration

- 1 migration = 1 เรื่อง; **ห้ามแก้ migration ที่ merge เข้า `main` แล้ว** — ถ้าผิด ให้สร้าง migration ใหม่มาแก้
- สร้างตารางใน `public` → ต้องมีใน migration เดียวกัน: `enable row level security` + policy ครบทุก operation ที่ต้องการ
- policy ระบุ role เสมอ (`to authenticated` / `to anon`) และใช้ `(select auth.uid())` ไม่ใช่ `auth.uid()` ตรงๆ
- function ทุกตัวใส่ `set search_path = ''` และอ้างชื่อแบบเต็ม (`public.profiles`)
- `security definer` ใช้เมื่อจำเป็นเท่านั้น + `revoke execute ... from public, anon, authenticated` ถ้าไม่ได้ตั้งใจให้ client เรียก
- ข้อมูลส่วนตัว (email, เบอร์โทร, ตำแหน่ง) ห้ามอยู่ในตารางที่คนอื่นอ่านได้ — แยกตาราง + policy เฉพาะเจ้าของ
- ใส่ check constraint ใน DB ด้วย (ไม่พึ่ง zod ฝั่ง client อย่างเดียว)

### เรียกข้อมูลจาก client

- ใช้ชื่อจาก `TABLES` / `SUPABASE_RPC` / `STORAGE_BUCKETS` ใน `@rukan/shared`
- เช็ค `error` ทุกครั้งที่เรียก (`const { data, error } = await supabase...`)
- select เฉพาะ column ที่ใช้ (`.select('id, display_name')`) ไม่ใช่ `*` ในหน้าที่ข้อมูลเยอะ
- Pagination: `paginationQuerySchema` + `toRange()` → `.range(from, to)`
- วันเวลาใน DB เป็น `timestamptz` (UTC) แปลงเป็นเวลาไทยที่ client
- logic ที่ต้องทำหลายตารางพร้อมกัน (transaction) หรือห้ามให้ client โกงได้ → เขียนเป็น Postgres function แล้วเรียกด้วย `.rpc()`

## 4. Environment Variables / Secrets

- เพิ่มตัวแปรใหม่ = แก้ `.env.example` + แจ้งทีม/ตั้งค่าใน Vercel หรือ EAS
- Client (`web`, `mobile`) ใส่ได้เฉพาะ `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` และต้องเป็นค่าที่เปิดเผยได้ — Supabase ใช้ได้แค่ **publishable key**
- secret key ของ Supabase ใช้ได้ใน Edge Functions เท่านั้น (`supabase secrets set`)
- ห้าม log ค่า secret, token, password ลง console
- ถ้าเผลอ commit secret: **เปลี่ยน (rotate) key นั้นทันที** ใน Supabase Dashboard — แค่ลบ commit ไม่พอ เพราะ repo เป็น public

## 5. Testing

- **Database (สำคัญที่สุด)**: pgTAP ใน `supabase/tests/database/<ตาราง>.test.sql` — ทุก policy ต้องทดสอบทั้งกรณีที่ "ทำได้" และ "ทำไม่ได้" (anon, เจ้าของ, คนอื่น)
  - สลับ role ใน test: `set local role authenticated; set local request.jwt.claims = '{"sub": "<uuid>", "role": "authenticated"}';`
  - รัน: `pnpm db:reset && pnpm db:test`
- shared: unit test (Vitest) สำหรับ zod schema / helper
- web/mobile: เริ่มจาก test ฟังก์ชันใน `src/lib` ก่อน UI test ค่อยเพิ่มทีหลัง
- ตั้งชื่อไฟล์ test: `<name>.test.ts(x)` (TS), `<name>.test.sql` (pgTAP)

## 6. เอกสาร

- เปลี่ยนสถาปัตยกรรม → อัปเดต `docs/ARCHITECTURE.md`
- ตัดสินใจเรื่องสำคัญ (เลือก library, เปลี่ยน hosting ฯลฯ) → เพิ่มใน `docs/DECISIONS.md`
- เพิ่ม/เปลี่ยนคำสั่งที่ใช้บ่อย → อัปเดต `AGENTS.md` หัวข้อ 3
