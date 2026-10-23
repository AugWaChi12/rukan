## สรุป

<!-- PR นี้ทำอะไร เพราะอะไร -->

## ส่วนที่แก้

- [ ] supabase (migration / RLS / function / storage)
- [ ] web
- [ ] mobile
- [ ] shared
- [ ] CI / docs

## Checklist

- [ ] ทดสอบบนเครื่องแล้ว (`pnpm lint && pnpm typecheck && pnpm test`)
- [ ] มี migration ใหม่? → ระบุชื่อ:
  - [ ] ตารางใหม่เปิด RLS + มี policy ครบ
  - [ ] มี pgTAP test ของ policy และ `pnpm db:test` ผ่าน
  - [ ] รัน `pnpm db:types` และ commit `database.types.ts` แล้ว
  - [ ] หลัง merge ต้องมีคน `supabase db push` ขึ้น project จริง
- [ ] เพิ่ม/เปลี่ยน env var? → อัปเดต `.env.example` แล้ว และแจ้งทีมให้ตั้งค่าใน Vercel / EAS
- [ ] อัปเดตเอกสาร (`AGENTS.md` / `docs/`) ถ้าจำเป็น
- [ ] ไม่มี secret / service_role key หลุดเข้ามาใน diff
