# Conventions — กฎการทำงานร่วมกัน

## 1. Git

### Branch

- `main` = โค้ดที่พร้อม deploy เสมอ (ล็อกด้วย branch protection: ต้องผ่าน PR + CI)
- แตก branch จาก `main` ตามรูปแบบ:

| ประเภท           | รูปแบบ                    | ตัวอย่าง                     |
| ---------------- | ------------------------- | ---------------------------- |
| ฟีเจอร์ใหม่      | `feature/<scope>-<สั้นๆ>` | `feature/api-auth-login`     |
| แก้บั๊ก          | `fix/<scope>-<สั้นๆ>`     | `fix/mobile-crash-on-logout` |
| งานจุกจิก/config | `chore/<สั้นๆ>`           | `chore/update-deps`          |
| เอกสาร           | `docs/<สั้นๆ>`            | `docs/architecture-auth`     |

`<scope>` = `api` | `web` | `mobile` | `shared` | `infra` | `repo`

### Commit message (Conventional Commits)

```
<type>(<scope>): <สรุปสั้นๆ>

feat(api): add login endpoint
fix(mobile): handle expired token on startup
chore(repo): add turbo pipeline for typecheck
docs: describe deploy flow for DigitalOcean
```

`type` = `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `style` | `perf`

### Pull Request

- 1 PR = 1 เรื่อง, เล็กพอให้ review ได้ใน 15 นาที
- ต้องมีเพื่อน approve อย่างน้อย 1 คน + CI เขียว ก่อน merge
- ใช้ **Squash merge** เข้า `main`
- ถ้าเปลี่ยน DB schema ให้เขียนใน PR ว่ามี migration อะไร
- ถ้าเพิ่ม env var ให้เขียนใน PR + อัปเดต `.env.example` + แจ้งทีมให้ตั้งค่าใน Vercel/DigitalOcean

## 2. TypeScript / โค้ด

- `strict: true` ทุก app
- ห้ามใช้ `any` (ถ้าจำเป็นจริงๆ ใช้ `unknown` แล้ว narrow)
- Format: Prettier (config กลางที่ root), Lint: ESLint
- Import ข้าม package ใช้ชื่อ package เช่น `import { UserDto } from '@stumatch/shared'` ห้ามใช้ relative path ข้าม app (`../../packages/...`)

### การตั้งชื่อ

| สิ่ง                     | รูปแบบ                   | ตัวอย่าง                            |
| ------------------------ | ------------------------ | ----------------------------------- |
| ไฟล์ทั่วไป               | kebab-case               | `match-card.tsx`, `auth.service.ts` |
| React component          | PascalCase (ชื่อ export) | `export function MatchCard()`       |
| ตัวแปร/ฟังก์ชัน          | camelCase                | `getUserById`                       |
| Type / Interface / Class | PascalCase               | `UserDto`, `MatchService`           |
| Constant                 | UPPER_SNAKE_CASE         | `MAX_GROUP_SIZE`                    |
| Zod schema               | camelCase + `Schema`     | `createMatchSchema`                 |
| Env var                  | UPPER_SNAKE_CASE         | `JWT_ACCESS_SECRET`                 |
| API path                 | kebab-case, พหูพจน์      | `/api/v1/match-requests`            |
| DB table / column        | snake_case               | `match_requests.created_at`         |

## 3. API Contract

- REST + JSON, prefix `/api/v1`
- ทุก endpoint ใหม่: กำหนด request/response schema ใน `packages/shared` **ก่อน** แล้วค่อยเขียน controller และ client
- Pagination: `?page=1&limit=20` → response `{ data: [...], meta: { page, limit, total } }`
- วันเวลา: ส่งเป็น ISO 8601 UTC (`2026-10-23T09:00:00.000Z`) แปลงเป็นเวลาไทยที่ client
- Status code: 200 อ่าน/แก้, 201 สร้าง, 204 ลบ, 400 ข้อมูลผิด, 401 ไม่ได้ login, 403 ไม่มีสิทธิ์, 404 ไม่พบ, 409 ชนกัน, 500 error ฝั่ง server

## 4. Environment Variables / Secrets

- เพิ่มตัวแปรใหม่ = แก้ 3 ที่: โค้ดที่ validate env, `.env.example`, และแจ้งทีม/ตั้งค่าใน Vercel หรือ DigitalOcean
- Client (`web`, `mobile`) ใส่ได้เฉพาะตัวแปร `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*` และต้องเป็นค่าที่เปิดเผยได้
- ห้าม log ค่า secret, token, password ลง console
- ถ้าเผลอ commit secret: **เปลี่ยน (rotate) key นั้นทันที** — แค่ลบ commit ไม่พอ เพราะ repo เป็น public

## 5. Testing

- API: unit test (Jest) สำหรับ service, e2e test สำหรับ endpoint สำคัญ
- shared: unit test สำหรับ zod schema ที่มี logic
- web/mobile: เริ่มจาก test ฟังก์ชันใน `src/lib` ก่อน UI test ค่อยเพิ่มทีหลัง
- ตั้งชื่อไฟล์ test: `<name>.spec.ts` (API), `<name>.test.ts(x)` (web/mobile/shared)

## 6. เอกสาร

- เปลี่ยนสถาปัตยกรรม → อัปเดต `docs/ARCHITECTURE.md`
- ตัดสินใจเรื่องสำคัญ (เลือก library, เปลี่ยน hosting ฯลฯ) → เพิ่มใน `docs/DECISIONS.md`
- เพิ่ม/เปลี่ยนคำสั่งที่ใช้บ่อย → อัปเดต `AGENTS.md` หัวข้อ 3
