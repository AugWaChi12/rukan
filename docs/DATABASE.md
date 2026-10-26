# Database — สร้าง / sync / เพิ่มตาราง

> **อ่านไฟล์นี้ก่อนแตะ `supabase/` หรือก่อนรันอะไรที่ต้องใช้ database**
> ไฟล์นี้คือ "คู่มือปฏิบัติ" (ทำยังไง) — ส่วน "ออกแบบไว้ว่าอะไร" อยู่ใน [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) หัวข้อ 4–5, 14
> และกฎการเขียน SQL อยู่ใน [`CONVENTIONS.md`](CONVENTIONS.md) หัวข้อ 3

---

## 0. สรุปสำหรับ AI / คนที่เพิ่งเข้ามา (อ่านแค่นี้ก่อน)

1. **ความจริงมีที่เดียว = ไฟล์ใน `supabase/migrations/`** — database ทุกที่ (เครื่องเรา, CI, Supabase จริง) สร้างจากไฟล์พวกนี้ตามลำดับ timestamp
   ไม่มีใครสร้าง/แก้ตารางด้วยมือ ไม่ว่าผ่าน Studio, Dashboard หรือ `psql`
2. **เริ่มงานทุกครั้ง → เช็คว่า DB บนเครื่องตรงกับ migrations** (หัวข้อ 2.3) โดยเฉพาะหลัง `git pull` / สลับ branch
   ถ้ามีไฟล์ใน `supabase/` เปลี่ยน → `db reset` (ข้อมูลบนเครื่องหายแล้วสร้างใหม่จาก seed — ปกติ ไม่ต้องกลัว)
3. **เพิ่ม/แก้ตาราง → ทำตาม checklist หัวข้อ 4 ให้ครบทุกข้อ** (migration → pgTAP → types → shared → อัปเดตไฟล์นี้)
4. **ข้อมูลอ่อนไหวอยู่ใน schema `private`** เข้าได้ทางเดียวคือ RPC ใน `public` (หัวข้อ 3.2)
   **client เขียนตารางตรงไม่ได้เลย** — ทุกการเขียนผ่าน RPC (validate + เช็คสิทธิ์ + rate limit ที่ server)
5. **ของใหม่ปิดเป็นค่าเริ่มต้น** (migration `security_baseline`) — function / table ใหม่ไม่มีใครเข้าได้จนกว่าจะ `grant` เอง
   และ `security_invariants.test.sql` จะ fail ถ้ามีช่องโหว่ (หัวข้อ 3.5) → เพิ่ม RPC ใหม่ต้องเพิ่มชื่อใน allowlist ของ test นั้นด้วย
6. ห้าม:
   - แก้ migration ที่ merge เข้า `main` แล้ว → สร้าง migration ใหม่มาแก้แทน
   - `db reset` / `db push --include-seed` กับ Supabase project จริง
   - ใช้ secret / service_role key ใน client

---

## 1. Database อยู่ที่ไหนบ้าง

| ที่                          | ใช้ทำอะไร                   | schema มาจาก                                    | ข้อมูลมาจาก                       |
| ---------------------------- | --------------------------- | ----------------------------------------------- | --------------------------------- |
| **Local** (Docker บนเครื่อง) | dev + เขียน/ทดสอบ migration | `supabase/migrations/*.sql` ตอน `start`/`reset` | `supabase/seed.sql` (ผู้ใช้ demo) |
| **CI** (GitHub Actions)      | รัน pgTAP + เช็ค types      | migrations เหมือนกัน                            | seed.sql                          |
| **Supabase จริง** (cloud)    | production (ยังไม่ได้สร้าง) | `supabase db push` หลัง merge เข้า `main`       | ผู้ใช้จริง — **ไม่มี seed**       |

Local ประกอบด้วย Postgres 17 + Auth + REST API + Storage + Realtime + Studio + Mailpit (ทั้งชุดใน Docker, จัดการด้วย Supabase CLI)

| Service              | URL                                                       |
| -------------------- | --------------------------------------------------------- |
| API (ที่ app ต่อ)    | http://127.0.0.1:54321                                    |
| Studio (ดูข้อมูล)    | http://127.0.0.1:54323                                    |
| Mailpit (อีเมล Auth) | http://127.0.0.1:54324                                    |
| Postgres ตรง         | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

---

## 2. สร้าง / sync database บนเครื่อง

> คำสั่งในหัวข้อนี้เขียนแบบ `pnpm db:*`
> **Windows ที่ Docker Desktop ใช้ไม่ได้** → ใช้ `pnpm db:wsl <คำสั่ง supabase>` แทน ตามตารางนี้ (ติดตั้งครั้งแรกดู README หัวข้อ "Windows: ใช้ Docker ใน WSL")
>
> | แทน                                         | ใช้ (WSL)                                                                                                             |
> | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
> | `pnpm db:start`                             | `pnpm db:wsl start`                                                                                                   |
> | `pnpm db:stop`                              | `pnpm db:wsl stop`                                                                                                    |
> | `pnpm db:status`                            | `pnpm db:wsl status`                                                                                                  |
> | `pnpm db:reset`                             | `pnpm db:wsl db reset`                                                                                                |
> | `pnpm db:test`                              | `pnpm db:wsl test db`                                                                                                 |
> | `pnpm db:types`                             | `pnpm db:wsl gen types typescript --local --schema public > packages/shared/src/database.types.ts` แล้ว `pnpm format` |
> | `pnpm db:migration`                         | `pnpm db:wsl migration new <ชื่อ>`                                                                                    |
> | `pnpm exec supabase migration list --local` | `pnpm db:wsl migration list --local`                                                                                  |
>
> และระหว่าง dev ต้องเปิด terminal แยกรัน `wsl -d Ubuntu-24.04 -- sleep infinity` ค้างไว้ ไม่งั้น WSL ดับเองแล้ว Supabase ดับตาม

### 2.1 ครั้งแรกบนเครื่องใหม่

```bash
pnpm install
pnpm db:start        # ครั้งแรกดึง Docker image นานหน่อย — สร้าง DB + รัน migrations + seed ให้เลย
pnpm db:status       # จด API URL + Publishable key
```

แล้วสร้างไฟล์ env ของ app (ค่า local เป็นค่า default เดียวกันทุกเครื่อง ไม่ใช่ความลับ แต่ไฟล์ยังห้าม commit):

| ไฟล์                  | คัดลอกจาก                  | ตัวแปร                                                             |
| --------------------- | -------------------------- | ------------------------------------------------------------------ |
| `apps/web/.env.local` | `apps/web/.env.example`    | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |
| `apps/mobile/.env`    | `apps/mobile/.env.example` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

ตรวจว่าใช้ได้ → หัวข้อ 2.4

### 2.2 ทุกครั้งที่เริ่มทำงาน

```bash
pnpm db:start        # ถ้ารันอยู่แล้วจะบอกว่า already running — ไม่เป็นไร
```

แล้วทำหัวข้อ 2.3 ต่อทันที

### 2.3 หลัง `git pull` / สลับ branch / merge — DB ตรงกับ migrations ไหม?

เช็คว่ามีไฟล์ใน `supabase/` เปลี่ยนไหม:

```bash
git diff --name-only HEAD@{1} HEAD -- supabase/    # เทียบกับตำแหน่งก่อน pull / switch ล่าสุด
```

หรือดูว่า migration ไหนยังไม่ได้ apply บนเครื่อง (คอลัมน์ `Remote` ว่าง = ยังไม่ apply):

```bash
pnpm exec supabase migration list --local
```

**ถ้ามีอะไรเปลี่ยน / ไม่ตรง → สร้าง DB ใหม่ทั้งก้อน:**

```bash
pnpm db:reset        # ลบ DB บนเครื่อง → รัน migrations ทั้งหมดตามลำดับ → seed.sql
pnpm db:test         # ต้องผ่านหมด
```

- `db reset` ลบข้อมูลบนเครื่องทั้งหมด (รวมที่กรอกเองตอนทดสอบ) — ตั้งใจให้เป็นแบบนี้ ข้อมูลที่ต้องมีทุกครั้งให้ใส่ใน `seed.sql`
- ถ้า `packages/shared/src/database.types.ts` ใน branch ไม่ตรงกับ DB → `pnpm db:types` (CI จะ fail ถ้าไม่ตรง)
- ถ้าใช้ `pnpm dev` อยู่ ไม่ต้องรีสตาร์ทเว็บ แต่ถ้า types เปลี่ยน ให้ `pnpm --filter @rukan/shared build`

### 2.4 ตรวจว่า DB ใช้ได้จริง

```bash
pnpm db:test                                                     # pgTAP ผ่านหมด
curl -s -X POST http://127.0.0.1:54321/rest/v1/rpc/health \
  -H "apikey: <publishable key จาก db:status>"                   # {"status":"ok","database":"up",...}
```

หรือเปิด Studio http://127.0.0.1:54323 ดูตาราง / ข้อมูล (ดูได้ แต่**ห้ามแก้ schema ใน Studio** — แก้แล้วไม่มี migration คนอื่นไม่ได้ด้วย)

---

## 3. โครงสร้าง database

### 3.1 Schema

| schema       | ของใคร   | API เปิด? | ใส่อะไร                                                                                               |
| ------------ | -------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `public`     | เรา      | ✅        | ตารางที่ไม่อ่อนไหว (เช่น `areas`, `interests`) + **RPC functions ที่ client เรียก** + trigger helpers |
| `private`    | เรา      | ❌        | ข้อมูลอ่อนไหวทั้งหมด + helper functions ภายใน (rate limit, เช็คสิทธิ์)                                |
| `auth`       | Supabase | —         | ผู้ใช้ / session — **ห้ามสร้างตารางเอง** อ่าน `auth.uid()` / `auth.jwt()` ได้                         |
| `storage`    | Supabase | —         | bucket + ไฟล์ — สร้าง bucket / policy ผ่าน migration ได้                                              |
| `extensions` | Supabase | —         | extension (`pgcrypto`, `pgtap`, ภายหลัง `pg_cron`, `postgis`)                                         |

### 3.2 ตารางใหม่ควรอยู่ schema ไหน

```
ข้อมูลนี้ทำให้รู้ตัวตน / ข้อมูลส่วนตัว / พฤติกรรมของใครไหม?
  (อีเมล, เบอร์, วันเกิด, ใครโพสต์, แชท, ใครปัดใคร, รายงาน, การยืนยันตัวตน, IP)
├─ ใช่ → private.<ตาราง>  + RLS เปิด ไม่มี policy
│        client เข้าถึงผ่าน public.<rpc>() (security definer) ที่คืนเฉพาะคอลัมน์ที่ปลอดภัย
└─ ไม่ใช่ (ข้อมูลอ้างอิง / ของสาธารณะ เช่น รายชื่อย่าน, ความสนใจ)
         → public.<ตาราง> + RLS + policy ระบุ role ครบทุก operation
```

ถ้าไม่แน่ใจ → ใส่ `private` ไว้ก่อน (เปิดทีหลังง่ายกว่าปิด)

### 3.3 สิ่งที่มีอยู่ตอนนี้ (อัปเดตทุกครั้งที่เพิ่ม migration)

**ตาราง**

| ตาราง                                                                    | client อ่าน                                         | client เขียน                                                                | migration                                     |
| ------------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| `public.profiles` (ชื่อ, bio, งาน, ย่าน, โหมด, ระดับยืนยัน, ตั้งค่า)     | เจ้าของ (แถวตัวเอง) / คนอื่นผ่าน `get_profile_card` | `update_my_profile`, `complete_onboarding`                                  | init_profiles → identity_core                 |
| `public.areas` / `interests` / `prompts`                                 | ทุกคน (anon ด้วย)                                   | migration เท่านั้น                                                          | identity_core                                 |
| `public.profile_interests` / `profile_prompts`                           | เจ้าของ                                             | `set_interests`, `set_prompt_answer`                                        | identity_core                                 |
| `public.photos` (metadata รูป)                                           | เจ้าของ / รูปที่ปลดล็อกผ่าน `get_profile_card`      | `add_photo`, `remove_photo`                                                 | photos_storage                                |
| `private.profile_private` (วันเกิด, เพศ\*, ช่วงอายุที่สนใจ)              | ผ่าน `get_my_profile` (คนอื่นเห็นเฉพาะ `age`)       | `complete_onboarding` (วันเกิดตั้งได้ครั้งเดียว)                            | identity_core                                 |
| `private.verifications` (เบอร์, liveness, องค์กร)                        | —                                                   | trigger เบอร์ / `mark_liveness_passed` (server)                             | identity_core                                 |
| `private.aliases` (นามแฝง Space)                                         | ผ่าน `get_my_profile`                               | trigger ตอนสมัคร                                                            | identity_core                                 |
| `private.consents`                                                       | ผ่าน `get_my_status`                                | `record_consent` (เวอร์ชันปัจจุบันเท่านั้น)                                 | identity_core                                 |
| `private.user_status` (ระงับ / แบน / strikes)                            | ผ่าน `get_my_status`                                | `mod_take_action`, `mod_review_appeal`                                      | security_baseline                             |
| `private.blocks` (รวม `is_anonymous_block` กันแอบดูชื่อจาก Space)        | ผ่าน `get_my_blocks` (ซ่อนชื่อถ้าเป็น anon block)   | `block_user_from`, `unblock_user`                                           | phase2_safety_moderation                      |
| `private.reports` (รายงาน + snapshot หลักฐาน + severity 1–3)             | moderator ผ่าน `mod_list_reports`, `mod_get_report` | `report_target`                                                             | phase2_safety_moderation                      |
| `private.moderation_actions` (ประวัติโทษ + คำอุทธรณ์ 14 วัน)             | เจ้าของผ่าน `get_my_moderation_history` / moderator | `mod_take_action`, `submit_appeal`, `mod_review`                            | phase2_safety_moderation                      |
| `private.identity_reveals_log` (audit log ตอน moderator เปิดดูตัวตน)     | — (บันทึกถาวร แก้/ลบไม่ได้)                         | `mod_reveal_author`                                                         | phase2_safety_moderation                      |
| `private.posts` / `post_replies` / `post_likes` / `mood_checkins`        | ผ่าน `get_feed`, `get_replies` (ไม่มี `author_id`)  | `create_post`, `reply_post`, `like_post` ฯลฯ                                | phase3_space → space_hashtags                 |
| `private.hashtag_hourly_stats` (สถิติ `#แท็ก` รายชั่วโมง)                | ผ่าน `get_trending_hashtags`                        | trigger `posts_sync_hashtag_stats`                                          | space_hashtags_and_scale                      |
| `private.bubbles` (ทักจากโพสต์ Space 1 ข้อความ)                          | ผ่าน `get_my_bubbles` (ไม่มี `sender_id`)           | `send_bubble`, `respond_bubble`                                             | phase4_bubbles_and_chat                       |
| `private.conversations` / `conversation_members` / `messages`            | ผ่าน `get_conversations`, `get_messages`            | `send_message`, `request_reveal`, `request_photo_unlock`                    | phase4_bubbles_and_chat                       |
| `private.swipe_deck` / `swipe_windows` / `swipes` / `matches`            | ผ่าน `get_my_deck`, `get_my_matches`                | `swipe`, `polite_close`, `unmatch`                                          | swipe_deck_rolling_window                     |
| `private.tier_configs` (ค่า limit & ราคาเหรียญของ Free / Gold / Premium) | ผ่าน `get_tier_configs`                             | `mod_update_tier_config`                                                    | plan_tiers_master → three_tiers_coins_and_ai  |
| `private.subscriptions` (สถานะสมาชิกต่อผู้ใช้: Free / Gold / Premium)    | เจ้าของผ่าน `get_my_subscription`                   | `mod_set_user_subscription`, `exchange_coins_for_pass`, `sync_revenuecat_*` | user_subscriptions → three_tiers_coins_and_ai |
| `private.coin_wallets` / `coin_ledger` (กระเป๋าเหรียญ Rukan Coin)        | เจ้าของผ่าน `get_my_subscription` (`coin_balance`)  | `exchange_coins_for_pass`, `mod_grant_user_coins`                           | three_tiers_coins_and_ai                      |
| `private.rate_events`                                                    | —                                                   | `private.check_rate()`                                                      | waitlist                                      |
| `private.waitlist`                                                       | moderator ผ่าน `mod_list_waitlist`                  | `join_waitlist`                                                             | waitlist                                      |

\* เพศ / สนใจเพศ: มีคอลัมน์แต่ยังไม่มี RPC เขียน — รอทีมตัดสินใจ Q16

**RPC ที่ client เรียกได้** (= allowlist 47 ฟังก์ชันใน `security_invariants.test.sql`)

| function                                                                                                                                                                                                                                                                                               | ใครเรียก                                      | ต้องยืนยันถึงระดับ                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ------------------------------------------ |
| `health()`, `join_waitlist(...)`, `get_tier_configs()`                                                                                                                                                                                                                                                 | anon + login                                  | —                                          |
| `get_my_status()`, `get_my_profile()`, `get_my_subscription()`, `get_my_moderation_history()`, `submit_appeal(...)`                                                                                                                                                                                    | login                                         | — (แม้ถูกระงับก็ดู/อุทธรณ์ได้)             |
| `record_consent(doc, version)`, `update_my_profile(...)`, `exchange_coins_for_pass(...)`, `block_user_from(...)`, `unblock_user(...)`, `get_my_blocks()`, `report_target(...)`                                                                                                                         | login                                         | none (แค่ไม่ถูกระงับ)                      |
| `complete_onboarding(...)`, `set_interests`, `set_prompt_answer`, `add_photo`, `remove_photo`                                                                                                                                                                                                          | login                                         | phone                                      |
| **Space (เฟส 3)**: `create_post`, `get_feed` (รองรับ `p_hashtag` + `p_sort: 'latest' \| 'hot'`), `get_trending_hashtags`, `delete_my_post`, `like_post`, `unlike_post`, `reply_post`, `get_replies`, `delete_my_reply`, `checkin_mood`                                                                 | login                                         | selfie (`get_feed`/`trending` ใช้ `phone`) |
| **Bubble & แชท (เฟส 4 + Realtime)**: `send_bubble`, `get_my_bubbles`, `respond_bubble`, `get_conversations`, `get_conversation`, `get_messages`, `send_message`, `mark_conversation_read`, `request_reveal`, `request_photo_unlock`, `can_access_realtime_topic`                                       | login                                         | selfie                                     |
| **Swipe deck & Match (เฟส 5)**: `get_my_deck`, `swipe`, `get_my_matches`, `polite_close`, `unmatch`, `get_profile_card`                                                                                                                                                                                | login                                         | selfie                                     |
| **Moderator & Admin**: `mod_list_reports`, `mod_get_report`, `mod_reveal_author`, `mod_take_action`, `mod_review_appeal`, `mod_list_appeals`, `mod_get_dashboard_counts`, `mod_get_waitlist_stats`, `mod_list_waitlist`, `mod_update_tier_config`, `mod_set_user_subscription`, `mod_grant_user_coins` | moderator (`app_metadata.role = 'moderator'`) | —                                          |

`get_my_status().next_step`: `restricted` → `consents` → `phone` → `profile` → `selfie` → `done`

**Storage**: bucket `photos` (private, ≤5MB, webp/jpeg, path `<uid>/<uuid>.webp`) — เจ้าของอัปโหลด/อ่าน/ลบได้แค่ของตัวเอง เขียนทับไม่ได้ · คนอื่นดูได้เฉพาะรูปที่ `get_profile_card` ปลดล็อกตาม `reveal_stage` (0=0 รูป, 1=1 รูป, 2=3 รูป, 3=6 รูป) · bucket `avatars` เดิมปิดเป็น private แล้ว (เลิกใช้)

**Helper ภายใน (`private`, client เรียกไม่ได้)**: `assert_signed_in()`, `assert_active_user(min_level)`, `assert_moderator()`, `user_state()`, `is_moderator()`, `is_blocked()`, `age_years()`, `age_band_label()`, `check_rate()`, `client_ip()`, `has_consent()`, `current_consent_version()`, `generate_alias()`, `is_own_photo_path()`, `mark_liveness_passed()`, `resolve_target_user()`, `contains_contact_or_pii()`, `contains_self_harm_signal()`, `contains_scam_keywords()`, `normalize_hashtag()`, `extract_hashtags()`, `post_hot_score()`, `purge_old_hashtag_stats()`, `recompute_reveal_stage()`, `user_tier()`, `user_limits()`, `sync_revenuecat_subscription()`, `swipe_quota_state()`, `consume_swipe()`, `fill_swipe_deck()`, `purge_stale_swipe_deck()`, `emit_conversation_signal()`, `emit_user_inbox_signal()`, `expire_stale_matches()`, `close_stale_anon_chats()`, `purge_old_rate_events()`

**Trigger**: `on_auth_user_created` (สร้าง profiles + profile_private + verifications + alias) · `on_auth_user_phone_confirmed` (→ ระดับ `phone`) · `post_likes_sync_count` (Delta O(1)) · `post_replies_sync_count` (Delta O(1)) · `posts_sync_hashtag_stats` · `*_set_updated_at`

pgTAP (192 tests / 9 ไฟล์ใน `supabase/tests/database/`): `security_invariants`, `identity`, `photos_storage`, `waitlist`, `phase2_safety_moderation`, `phase3_space`, `phase4_bubbles_and_chat`, `phase5_matches_and_drops`, `swipe_tiers_realtime`

ผู้ใช้ใน seed (รหัส `password123`): `demo` (1111…) และ `demo2` (2222…) ยืนยันครบ · `demo3` (3333…) ผู้ใช้ใหม่

### 3.4 ไฟล์ใน `supabase/`

```
supabase/
├── config.toml                 ← ตั้งค่า local (ports, auth, storage) — แก้แล้วต้อง db:stop + db:start
├── migrations/
│   └── <timestamp>_<เรื่อง>.sql  ← สร้างด้วยคำสั่ง แล้ว **เช็คว่าเรียงหลังไฟล์ล่าสุด** (ดูหมายเหตุด้านล่าง)
├── seed.sql                    ← ข้อมูลทดสอบ local/CI เท่านั้น (ผู้ใช้ demo) — ห้ามมีข้อมูลจริง
└── tests/database/
    └── <เรื่อง>.test.sql         ← pgTAP 1 ไฟล์ต่อ 1 เรื่อง ชื่อตรงกับ migration
```

> ⚠️ **timestamp ต้องเรียงหลังไฟล์ล่าสุดเสมอ** — migration บางไฟล์ใน repo ตั้งเวลาล่วงหน้า (เช่น `…200000`) ทำให้ `pnpm db:migration` สร้างไฟล์ที่ **รันก่อน** ไฟล์เก่า และถูกไฟล์เก่าทับ
> หลังสร้างให้ `ls supabase/migrations | tail -3` ถ้าไฟล์ใหม่ไม่อยู่ท้ายสุด → เปลี่ยนชื่อ timestamp ให้มากกว่าไฟล์ล่าสุด (เจอจริงตอนแก้ P0-1 ใน `AUDIT.md`)

**ตั้งชื่อ migration** (snake_case, ภาษาอังกฤษ, บอกว่าทำอะไร):

| แบบ                     | ตัวอย่าง                                    |
| ----------------------- | ------------------------------------------- |
| ฟีเจอร์ใหม่ (หลายตาราง) | `identity_core`, `space_posts`, `chat`      |
| ตารางเดียว              | `areas`, `blocks`                           |
| แก้ของเดิม              | `profiles_restrict_select`, `photos_bucket` |
| ลบของเดิม               | `drop_avatars_bucket`                       |

**ลำดับในไฟล์ migration** (ให้ทุกไฟล์อ่านเหมือนกัน):

1. หัวไฟล์: comment บอกว่าทำอะไร + อ้างหัวข้อใน docs
2. schema / extension ที่ต้องใช้ (`create ... if not exists`)
3. ตาราง → index → `enable row level security` → policy → trigger (ทีละตาราง)
4. helper functions ใน `private`
5. RPC ใน `public`
6. `grant` ท้ายไฟล์ — **เฉพาะที่ตั้งใจเปิด** (ของใหม่ปิดอยู่แล้ว ไม่ต้อง revoke)

### 3.5 รั้วความปลอดภัยอัตโนมัติ (`security_invariants.test.sql`)

test นี้ fail ใน CI ทันทีถ้าเจอข้อใดข้อหนึ่ง — **ห้ามแก้ test ให้ผ่านโดยไม่เข้าใจว่าทำไม fail**:

1. ตารางใน `public` / `private` ที่ไม่เปิด RLS
2. function ที่ไม่ตั้ง `search_path`
3. anon เรียก function นอก allowlist (`health`, `join_waitlist`)
4. authenticated เรียก function ที่ไม่อยู่ใน allowlist ของ API → **เพิ่ม RPC ใหม่ = เพิ่มชื่อตรงนี้** (คนรีวิวจะเห็นว่า API เปลี่ยน)
5. function ใน `private` ที่ client เรียกได้ / client มีสิทธิ์ใช้ schema `private`
6. client มีสิทธิ์ insert / update / delete ตารางใน `public` ตรงๆ
7. anon อ่านตารางอื่นนอกจาก `areas` / `interests` / `prompts`
8. มี storage bucket แบบ public
9. function `security definer` ที่ไม่ได้เป็นของ `postgres`

---

## 4. เพิ่ม / แก้ตาราง — checklist (ทำครบทุกข้อ)

```bash
git switch -c feature/<เรื่อง>          # 1. branch ใหม่จาก main ล่าสุด
pnpm db:migration <เรื่อง>               # 2. ได้ไฟล์ว่าง supabase/migrations/<timestamp>_<เรื่อง>.sql
                                         # 3. เขียน SQL ตาม template 4.1 / 4.2
pnpm db:reset                            # 4. สร้าง DB ใหม่จาก migration ทั้งหมด — ต้องไม่ error
                                         # 5. เขียน supabase/tests/database/<เรื่อง>.test.sql ตาม 4.3
pnpm db:test                             # 6. ผ่านหมด
pnpm db:types                            # 7. อัปเดต packages/shared/src/database.types.ts
```

8. เพิ่ม RPC ที่ client เรียก → เพิ่มชื่อใน allowlist ของ `security_invariants.test.sql` แล้ว `pnpm db:test` อีกรอบ
9. `packages/shared`: เพิ่มชื่อใน `constants/supabase.ts` (`TABLES` / `SUPABASE_RPC` / `STORAGE_BUCKETS`) + zod schema ใน `schemas/` + test
10. อัปเดต **หัวข้อ 3.3 ของไฟล์นี้** + ถ้ามีการตัดสินใจใหม่ → `DECISIONS.md`
11. `pnpm lint && pnpm typecheck && pnpm test`
12. commit (`feat(db): ...`) → PR — เขียนใน PR ว่า "มี migration ใหม่ หลัง merge ต้อง `db push`" (หัวข้อ 5)

ถ้า migration ยังไม่ merge แล้วอยากแก้ → แก้ไฟล์เดิมได้ แล้ว `pnpm db:reset` ใหม่
ถ้า merge เข้า `main` แล้ว → **ห้ามแก้** สร้าง migration ใหม่ (`alter table ...`)

### 4.1 Template: ตารางใน `private` + RPC (แบบหลักของแอปนี้)

```sql
-- =============================================================================
-- <เรื่อง> — ดู docs/SYSTEM_DESIGN.md หัวข้อ <x>
-- =============================================================================

create table private.things (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index things_user_id on private.things (user_id);
alter table private.things enable row level security;   -- ไม่มี policy = ไม่มีใครเข้าตรงได้

create trigger things_set_updated_at
  before update on private.things
  for each row execute function public.set_updated_at();

-- RPC ที่ client เรียก
create function public.create_thing(p_body text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.assert_active_user();   -- login + ไม่ถูกระงับ + ยืนยัน selfie แล้ว (ส่ง 'phone' / 'none' ถ้าแค่นั้นพอ)
  v_id uuid;
begin
  perform private.check_rate('create_thing', v_uid::text, 20, interval '1 hour');

  insert into private.things (user_id, body) values (v_uid, p_body)
  returning id into v_id;

  return json_build_object('id', v_id);   -- คืนเฉพาะที่ปลอดภัย
end;
$$;

-- ของใหม่ปิดอยู่แล้ว (security_baseline) → grant เฉพาะคนที่ควรเรียก
-- แล้วเพิ่ม 'create_thing' ใน allowlist ข้อ 4 ของ security_invariants.test.sql
grant execute on function public.create_thing(text) to authenticated;
```

### 4.2 Template: ตารางใน `public` (ข้อมูลไม่อ่อนไหว)

```sql
create table public.moods (
  id text primary key check (id ~ '^[a-z0-9_]{2,40}$'),   -- เช่น 'tired'
  name_th text not null,
  name_en text not null,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.moods enable row level security;

-- ของใหม่ไม่มีสิทธิ์ใดๆ (security_baseline) → grant select อย่างเดียว
-- (ให้ anon อ่าน = ต้องเพิ่มชื่อใน allowlist ข้อ 8 ของ security_invariants.test.sql)
grant select on public.moods to anon, authenticated;

create policy "moods: ทุกคนอ่านรายการที่เปิดใช้"
  on public.moods for select
  to anon, authenticated
  using (active);
-- ไม่ grant insert/update/delete = client แก้ไม่ได้ (แก้ผ่าน migration หรือ RPC ของ moderator)
```

### 4.3 Template: pgTAP

```sql
-- ทดสอบ <เรื่อง>: <สรุปสิทธิ์>
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

select ok(
  (select relrowsecurity from pg_class where oid = 'private.things'::regclass),
  'private.things เปิด RLS'
);

-- anon เรียกไม่ได้
set local role anon;
select throws_ok($$ select public.create_thing('hi') $$, '42501', null, 'anon เรียก create_thing ไม่ได้');

-- ผู้ใช้ demo (จาก seed.sql) เรียกได้
set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';
select lives_ok($$ select public.create_thing('hi') $$, 'ผู้ใช้ที่ login สร้างได้');

-- เข้าตารางตรงไม่ได้
select throws_ok($$ select * from private.things $$, '42501', null, 'อ่าน private.things ตรงไม่ได้');

select * from finish();
rollback;
```

ทุก policy / RPC ต้องทดสอบทั้ง **ทำได้** และ **ทำไม่ได้** (anon, เจ้าของ, คนอื่น, ยังไม่ยืนยัน, ถูกระงับ) — ผู้ใช้ทดสอบใน seed: `1111...` (demo), `2222...` (demo2), `3333...` (demo3 ยังไม่ยืนยัน) · ตัวอย่างครบ: `identity.test.sql`

เรียก function เพื่อเตรียมข้อมูลในไฟล์ test ให้ใช้ `do $$ begin perform ...; end $$;` (`select` เปล่าๆ จะพ่นแถวที่ไม่ใช่ TAP)

---

## 5. ขึ้น Supabase จริง

ทำโดยคนที่มีสิทธิ์ project เท่านั้น — **AI ห้ามรันคำสั่งที่แตะ project จริงเองโดยไม่ได้รับคำสั่งชัดเจน**

ครั้งแรก (ยังไม่ได้ทำ — ดู [`ARCHITECTURE.md`](ARCHITECTURE.md) หัวข้อ 6):

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push              # apply migrations ทั้งหมด (seed ไม่ถูก push)
```

หลัง merge PR ที่มี migration ใหม่เข้า `main`:

```bash
git switch main && git pull
pnpm exec supabase migration list       # ดูว่า remote ขาด migration ไหน
pnpm exec supabase db push --dry-run    # ดูก่อนว่าจะรันอะไร
pnpm exec supabase db push
```

- migration ต้อง**ผ่าน CI บน `main` ก่อน** push ขึ้นจริง
- migration ที่ลบ/เปลี่ยนคอลัมน์ที่มีข้อมูล → เขียนให้ไม่ทำข้อมูลหาย (เพิ่มคอลัมน์ใหม่ → ย้ายข้อมูล → ลบอันเก่าใน migration ถัดไป)
- ภายหลังทำเป็น GitHub Action ได้ (ต้องเก็บ `SUPABASE_ACCESS_TOKEN` + DB password ใน GitHub Secrets)

---

## 6. แก้ปัญหา

| อาการ                                                   | สาเหตุ / วิธีแก้                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| เว็บ/แอป `ERR_CONNECTION_REFUSED` ที่ `127.0.0.1:54321` | Supabase ไม่ได้รัน → `pnpm db:start` · ถ้าใช้ WSL: WSL ดับเอง → เปิด `sleep infinity` ค้างไว้ (หัวข้อ 2)                      |
| `relation "..." does not exist` / function ไม่มี        | DB ไม่ตรงกับ migrations → `pnpm db:reset`                                                                                     |
| `db reset` error ใน migration ใหม่                      | แก้ SQL ใน migration นั้น (ถ้ายังไม่ merge) แล้ว reset ใหม่                                                                   |
| CI fail "database.types.ts ไม่ตรงกับ schema"            | `pnpm db:types` แล้ว commit                                                                                                   |
| app ไม่เห็น type ใหม่                                   | `pnpm --filter @rukan/shared build`                                                                                           |
| `permission denied for function/table` จาก client       | ของใหม่ปิดเป็นค่าเริ่มต้น → ลืม `grant` (แล้วเพิ่มชื่อใน allowlist ของ security_invariants) หรือ policy ไม่ครอบคลุม role นั้น |
| `security_invariants` fail                              | migration เปิดช่อง (หัวข้อ 3.5) — แก้ migration ไม่ใช่แก้ test เว้นแต่ตั้งใจเปิด API ใหม่จริง                                 |
| pgTAP: error ที่คาดว่าจะเกิดไม่ถูกนับใน rate limit      | ใน test ทุก call ที่ error ถูก rollback ด้วย — ต้องเรียกสำเร็จให้ครบจำนวนก่อน (ดู `waitlist.test.sql`)                        |
| `pnpm db:*` บน Windows error เรื่อง Docker              | ใช้ `pnpm db:wsl ...` (หัวข้อ 2)                                                                                              |
