## สรุป

<!-- PR นี้ทำอะไร เพราะอะไร -->

## ส่วนที่แก้

- [ ] api
- [ ] web
- [ ] mobile
- [ ] shared
- [ ] infra / CI / docs

## Checklist

- [ ] ทดสอบบนเครื่องแล้ว (`pnpm lint && pnpm typecheck && pnpm test`)
- [ ] มี DB migration? → ระบุชื่อ migration:
- [ ] เพิ่ม/เปลี่ยน env var? → อัปเดต `.env.example` แล้ว และแจ้งทีมให้ตั้งค่าใน Vercel / DigitalOcean
- [ ] อัปเดตเอกสาร (`AGENTS.md` / `docs/`) ถ้าจำเป็น
- [ ] ไม่มี secret / key หลุดเข้ามาใน diff
