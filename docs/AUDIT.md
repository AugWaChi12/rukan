# Audit — รู้กัน (rukan) · 2026-10-24

> ตรวจตาม `docs/prompts/02-enterprise-audit-redesign-qa.md` เฟส 1 (BA + SA) บน `main` ณ commit `425424a`
> ไฟล์นี้คือ **ผลตรวจ + roadmap** — แก้ข้อไหนแล้วให้ขีดสถานะในตาราง อย่าลบทิ้ง (ใช้เป็นประวัติ)

---

## 1. สรุปผู้บริหาร

- **สภาพรวมดีกว่าที่คาด**: backend เฟส 1–5 ครบ (Space, Bubble/แชท, Daily Drop/Match, moderation) · pgTAP **152 → 155 ข้อ** ผ่านหมด · lint / typecheck / test (shared 38, api 20) / build ผ่าน · รั้ว `security_invariants` ยังทำงาน (ทุกตาราง RLS, allowlist RPC ~60 ตัว, ไม่มี bucket public)
- **เจอช่องโหว่ร้ายแรง 2 ข้อ (P0) — แก้แล้วใน branch `fix/p0-security-audit`**
  1. ใครก็เป็น moderator ได้ถ้าใช้อีเมล `@rukan.app` หรือ `demo@rukan.dev` → เปิดดูตัวตนคนโพสต์ Space, อ่านอีเมล waitlist, แก้ราคา tier
  2. Google login ไม่ได้ใช้ PKCE จริง + หน้า callback รับ `access_token` จาก URL → ถูกยัด session ของคนอื่นได้ (login CSRF)
- **ช่องว่างหลักฝั่งธุรกิจ**: tier Free / Gold มีแค่ตารางตั้งค่า **ยังไม่มีผลกับอะไรเลย** (ไม่มี tier ต่อผู้ใช้, ไม่มีการจ่ายเงิน) · Daily Drop ใช้วันที่ UTC (ตัดวันตอน 07:00 ไทย ไม่ใช่ 19:00) · ยังไม่มี Realtime
- **กระบวนการ**: commit ~20 ตัวเข้า `main` ตรงโดยไม่ผ่าน PR (ขัดกฎเหล็กข้อ 6) และมีการแก้ migration หลัง push (`plan_tiers_master` เพิ่ม RLS ทีหลัง) — ยังไม่เสียหายเพราะยังไม่มี Supabase project จริง แต่ต้องหยุดก่อนขึ้น production

---

## 2. ช่องโหว่ / ความเสี่ยง (SA + QA)

| #    | ระดับ    | เรื่อง                                                                                                                                                                                                    | หลักฐาน                                                                                                                                                             | สถานะ                                                                                                                                                                                                                                            |
| ---- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-1 | 🔴 วิกฤต | `private.is_moderator()` ให้สิทธิ์ตามอีเมล (`like '%@rukan.app'`, อีเมลตายตัว `demo@rukan.dev` ฯลฯ) — อีเมลเป็นข้อมูลที่ผู้ใช้กรอกเอง                                                                     | `20261024170000_admin_console.sql:6` · พิสูจน์แล้ว: test 2 ข้อ fail บนโค้ดเดิม                                                                                      | ✅ แก้: migration `20261024200100_moderator_role_from_app_metadata_only` (เชื่อแค่ `app_metadata.role`) + pgTAP 3 ข้อ (อีเมล @rukan.app / demo@rukan.dev / `user_metadata.role` ต้องโดนปฏิเสธ) · seed ตั้ง demo เป็น moderator ผ่าน app_metadata |
| P0-2 | 🔴 วิกฤต | client ไม่ตั้ง `flowType: 'pkce'` (Google ใช้ implicit flow → token อยู่ใน URL) + `/auth/callback` และหน้า sign-in เรียก `setSession()` ด้วย token จาก URL                                                | `apps/mobile/src/lib/supabase.ts`, `app/auth/callback.tsx`, `features/auth/sign-in-screen.tsx` · ทดสอบ: เปิดลิงก์ที่ยัด token ของ demo2 → โค้ดเดิม login เป็น demo2 | ✅ แก้: เปิด PKCE (ยืนยันแล้วว่า request มี `code_challenge` + `s256`), ลบ `api.auth.setSession`, callback รอ supabase-js แลก code เอง + แสดง error จาก provider · ทดสอบซ้ำ: ลิงก์ยัด token ไม่ทำให้ login                                       |
| P1-1 | 🟠 สูง   | admin console (`apps/web/src/app/admin/page.tsx`) เรียก `supabase.rpc(...)` ตรง ~15 จุด ไม่ผ่าน `@rukan/api` (ไม่มี zod parse, error ไม่เป็น `ApiError`)                                                  | grep `supabase.rpc`                                                                                                                                                 | ✅ แก้: เพิ่ม `moderation.*` / `getTierConfigs` / `getMySubscription` ใน `@rukan/api` + zod schemas ใน `@rukan/shared` และย้าย `admin/page.tsx` มาเรียกผ่าน `createApi` ทั้งหมด                                                                  |
| P1-2 | 🟠 สูง   | การ migration: timestamp ใน repo (`…170000`, `…200000`) อยู่ "อนาคต" กว่าเวลาจริง → `pnpm db:migration` สร้างไฟล์ที่เรียงก่อน และถูก migration เก่าทับ (เจอจริงตอนแก้ P0-1 ต้องเปลี่ยนชื่อเป็น `…200100`) | ls `supabase/migrations`                                                                                                                                            | ✅ กติกา: ตั้งชื่อใหม่ให้เรียงหลังไฟล์ล่าสุดเสมอ (ดู DATABASE.md 3.4)                                                                                                                                                                            |
| P1-3 | 🟠 สูง   | แก้ migration ที่ push เข้า `main` แล้ว (เพิ่ม `enable row level security` ใน `plan_tiers_master`)                                                                                                        | commit `1ea3738`                                                                                                                                                    | ⬜ ก่อนมี project จริงยังโอเค — หลังจากนั้นห้าม (CONVENTIONS 3)                                                                                                                                                                                  |
| P1-4 | 🟡 กลาง  | ยังไม่มี Realtime (แชทต้อง poll) — ตอนทำต้องใช้ private broadcast + RLS บน `realtime.messages` ตาม D36 ห้ามใช้ postgres_changes                                                                           | grep `realtime` = 0                                                                                                                                                 | ✅ แก้: migration `20261024200300_realtime_private_broadcast` (RLS บน `realtime.messages` + `can_access_realtime_topic` + ส่งเฉพาะสัญญาณไม่มี `sender_id`) + `api.realtime.subscribeConversation` / `subscribeUserInbox` บนมือถือ                |
| P1-5 | 🟡 กลาง  | `contains_contact_or_pii` / `contains_scam_keywords` เป็น regex — เลี่ยงง่าย (เว้นวรรค, ตัวเลขไทย, emoji)                                                                                                 | `phase3_space.sql:96`, `phase4…:86`                                                                                                                                 | ⬜ ยอมรับได้ใน MVP + มีรายงานเป็นด่านหลัง                                                                                                                                                                                                        |
| P2-1 | 🟢 ต่ำ   | ปุ่มบางปุ่มบนหน้า sign-in ไม่มี accessible name (screen reader อ่านไม่ออก)                                                                                                                                | ตรวจด้วย accessibility tree                                                                                                                                         | ⬜                                                                                                                                                                                                                                               |

**สิ่งที่ตรวจแล้วผ่าน** ✅

- แชทนามแฝง: `get_conversations` / `get_conversation` คืน `peer.user_id = null` เมื่อ `is_anonymous` และมี pgTAP ยืนยัน
- RPC `mod_*` ทุกตัวเรียก `private.assert_moderator()`
- admin UI ตัดสินสิทธิ์จากผล RPC (server-enforced) ไม่ใช่จากอีเมลฝั่ง client
- มือถือ: หน้าจอเรียกข้อมูลผ่าน `@rukan/api` (เหลือแค่ session provider / callback ที่แตะ `supabase.auth`)
- session บนมือถือเก็บใน `LargeSecureStore` + refresh ตาม AppState

---

## 3. ช่องว่างฝั่งผลิตภัณฑ์ (BA)

| ลูป                   | สถานะ                                                           | ช่องว่าง / edge case                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a) Onboarding + ตัวตน | ✅ ครบ ยกเว้น vendor                                            | SMS OTP ยังไม่มีผู้ให้บริการ · selfie ยังไม่มี vendor (ข้อเสนอใน DECISIONS) · **เบอร์ถูกส่งต่อให้คนใหม่ (เบอร์รีไซเคิล)**: ยังไม่มีทางกู้ / ย้ายบัญชี                                                                |
| b) Space              | ✅ backend + UI แท็บ                                            | ตรวจ contact / คำเสี่ยงด้วย regex (P1-5) · care notice เมื่อเจอคำเสี่ยงฆ่าตัวตาย ✅ มีแล้ว                                                                                                                           |
| c) Bubble + แชท       | ✅ backend                                                      | ไม่มี Realtime (P1-4) · **ผู้ใช้ถูกระงับกลางแชท**: ต้องตัดสินว่าคู่สนทนาเห็นอะไร (ตอนนี้ RPC ฝั่งผู้ถูกระงับโดนบล็อก แต่ห้องยังเปิด)                                                                                 |
| d) Daily Drop + Match | ✅ backend (สร้าง drop แบบ lazy ตอนเรียก, expire match ตอนอ่าน) | **วันที่ใช้ `current_date` ของ DB (UTC)** → ตัดวัน 07:00 ไทย และ drop ใช้ได้ทันทีไม่ใช่ 19:00 · ยังไม่ตั้ง `pg_cron` (แจ้งเตือน 19:00 ยังไม่มี) · จำนวนต่อวันเขียนตายตัว ไม่อ่านจาก tier                             |
| e) รายได้ + tier      | ⚠️ มีแค่ config                                                 | `private.tier_configs` + หน้าแก้ใน admin มีแล้ว แต่ **ไม่มี tier ต่อผู้ใช้, ไม่มี RPC ไหนอ่านค่า limit, ไม่มีระบบจ่ายเงิน** (IAP / store) · ต้องตัดสินใจก่อน: จ่ายผ่าน App Store / Play (บังคับสำหรับ digital goods) |

---

## 4. Roadmap

### P0 — ความปลอดภัย + auth (ทำแล้วใน `fix/p0-security-audit`)

- [x] P0-1 moderator จาก app_metadata เท่านั้น
- [x] P0-2 PKCE จริง + ห้ามรับ token จาก URL
- [ ] ตั้ง branch protection บน `main` (บังคับ PR + CI ผ่าน) — **คนที่เป็น admin ของ repo ต้องตั้งเอง**

### P1 — แกนหลักให้ใช้ได้จริง

- [x] ~~Daily Drop ตามเวลาไทย 19:00~~ → swipe deck แบบโควตาต่อรอบ 6 ชม. (D60) — migration `20261025090000_swipe_deck_rolling_window`
- [x] Tier ต่อผู้ใช้: `private.subscriptions` (tier, source, expires_at) + helper `private.user_limits()` → ใช้ใน `get_my_deck` / `send_bubble` / `swipe` + pgTAP · เลือกช่องทางจ่ายเงิน: RevenueCat (App Store / Google Play IAP) + manual/promo (D58)
- [x] Realtime แชทแบบ private broadcast (D36)
- [x] ย้าย admin console ไปใช้ `@rukan/api` (เพิ่มฟังก์ชัน `mod*` ใน api + test)
- [ ] selfie liveness (รอทีมยืนยันข้อเสนอใน DECISIONS) · SMS OTP vendor
- [ ] นโยบายเบอร์รีไซเคิล + การกู้บัญชี

### P2 — UX / ความประณีต (ตาม prompt เฟส 2)

- [ ] ฟอนต์ Prompt / Anuphan บนมือถือ, ไอคอนแท็บ, accessible name ทุกปุ่ม
- [ ] haptics, spring scale 0.96, skeleton loading, optimistic update
- [ ] Drop แบบการ์ดปัด + blur-to-reveal, แชทแบบ timeline การเปิดรูป
- [ ] E2E: Maestro (มือถือ) / Playwright (admin) — deep link, เน็ตหลุดกลางทาง, session หมดอายุ

---

## 5. วิธีตรวจซ้ำ

```bash
pnpm db:reset && pnpm db:test          # (WSL: pnpm db:wsl db reset / test db) — ต้องผ่าน 155+
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

ทดสอบ P0-2 ด้วยมือบน expo web: เปิด `/auth/callback#access_token=<token ของ user อื่น>&refresh_token=…` → ต้องไม่ login · เปิด `/auth/callback?error=access_denied` → ต้องขึ้นข้อความ error
