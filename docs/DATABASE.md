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
5. ห้าม:
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

| migration                        | object                                                                          | ใครเข้าได้                                                    | หมายเหตุ                                     |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------- |
| `20261023033015_init_profiles`   | function `public.set_updated_at()`                                              | trigger ใช้                                                   | ใช้กับทุกตารางที่มี `updated_at`             |
|                                  | table `public.profiles` (`id`, `display_name`, `avatar_url`, `bio`, timestamps) | authenticated อ่านได้ทุกแถว, แก้ได้แค่ของตัวเอง · anon ไม่ได้ | ⚠️ เฟส 1 จะปิด select ตรง (SYSTEM_DESIGN 0)  |
|                                  | trigger `on_auth_user_created` → `public.handle_new_user()`                     | ระบบ                                                          | สมัครแล้วสร้าง profile ให้                   |
|                                  | function `public.health()`                                                      | anon, authenticated                                           | health check                                 |
| `20261023033018_avatars_storage` | bucket `avatars` (public, ≤5MB, jpeg/png/webp)                                  | ทุกคนดู · อัปโหลด/แก้/ลบเฉพาะ `<user id>/...`                 | ⚠️ เฟส 1 แทนด้วย bucket `photos` แบบ private |
| `20261023194321_waitlist`        | schema `private`                                                                | ไม่มี (revoke หมด)                                            | สร้างครั้งแรกที่นี่                          |
|                                  | `private.client_ip()`, `private.rate_events`, `private.check_rate()`            | ภายใน                                                         | rate limit กลาง ใช้ซ้ำได้                    |
|                                  | table `private.waitlist`                                                        | ผ่าน RPC เท่านั้น                                             | อีเมลคนลงชื่อรอใช้ (เว็บ)                    |
|                                  | function `public.join_waitlist(...)`                                            | anon, authenticated                                           | คืนแค่ `{ok:true}`, 10 ครั้ง/ชม./IP          |

pgTAP: `supabase/tests/database/profiles.test.sql`, `waitlist.test.sql`

ตารางที่จะสร้างต่อ (ตามเฟส) → [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) หัวข้อ 5 (data model) และ 14 (ลำดับการสร้าง)

### 3.4 ไฟล์ใน `supabase/`

```
supabase/
├── config.toml                 ← ตั้งค่า local (ports, auth, storage) — แก้แล้วต้อง db:stop + db:start
├── migrations/
│   └── <timestamp>_<เรื่อง>.sql  ← สร้างด้วยคำสั่ง ห้ามตั้ง timestamp เอง
├── seed.sql                    ← ข้อมูลทดสอบ local/CI เท่านั้น (ผู้ใช้ demo) — ห้ามมีข้อมูลจริง
└── tests/database/
    └── <เรื่อง>.test.sql         ← pgTAP 1 ไฟล์ต่อ 1 เรื่อง ชื่อตรงกับ migration
```

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
6. `revoke` / `grant` ท้ายไฟล์ (ทุก function)

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

8. `packages/shared`: เพิ่มชื่อใน `constants/supabase.ts` (`TABLES` / `SUPABASE_RPC` / `STORAGE_BUCKETS`) + zod schema ใน `schemas/` + test
9. อัปเดต **หัวข้อ 3.3 ของไฟล์นี้** + ถ้ามีการตัดสินใจใหม่ → `DECISIONS.md`
10. `pnpm lint && pnpm typecheck && pnpm test`
11. commit (`feat(db): ...`) → PR — เขียนใน PR ว่า "มี migration ใหม่ หลัง merge ต้อง `db push`" (หัวข้อ 5)

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
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  perform private.check_rate('create_thing', v_uid::text, 20, interval '1 hour');

  insert into private.things (user_id, body) values (v_uid, p_body)
  returning id into v_id;

  return json_build_object('id', v_id);   -- คืนเฉพาะที่ปลอดภัย
end;
$$;

revoke execute on function public.create_thing(text) from public, anon;
grant execute on function public.create_thing(text) to authenticated;
```

### 4.2 Template: ตารางใน `public` (ข้อมูลไม่อ่อนไหว)

```sql
create table public.areas (
  id text primary key,                         -- เช่น 'ari'
  name_th text not null,
  name_en text not null,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.areas enable row level security;

create policy "areas: ทุกคนอ่านได้"
  on public.areas for select
  to anon, authenticated
  using (true);
-- ไม่มี policy insert/update/delete = แก้ได้ผ่าน migration เท่านั้น

create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();
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

ทุก policy / RPC ต้องทดสอบทั้ง **ทำได้** และ **ทำไม่ได้** (anon, เจ้าของ, คนอื่น) — ผู้ใช้ทดสอบใน seed: `1111...` (demo) และ `2222...` (demo2)

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

| อาการ                                                   | สาเหตุ / วิธีแก้                                                                                         |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| เว็บ/แอป `ERR_CONNECTION_REFUSED` ที่ `127.0.0.1:54321` | Supabase ไม่ได้รัน → `pnpm db:start` · ถ้าใช้ WSL: WSL ดับเอง → เปิด `sleep infinity` ค้างไว้ (หัวข้อ 2) |
| `relation "..." does not exist` / function ไม่มี        | DB ไม่ตรงกับ migrations → `pnpm db:reset`                                                                |
| `db reset` error ใน migration ใหม่                      | แก้ SQL ใน migration นั้น (ถ้ายังไม่ merge) แล้ว reset ใหม่                                              |
| CI fail "database.types.ts ไม่ตรงกับ schema"            | `pnpm db:types` แล้ว commit                                                                              |
| app ไม่เห็น type ใหม่                                   | `pnpm --filter @rukan/shared build`                                                                      |
| `permission denied for function/table` จาก client       | ลืม `grant execute ... to anon/authenticated` หรือ policy ไม่ครอบคลุม role นั้น                          |
| pgTAP: error ที่คาดว่าจะเกิดไม่ถูกนับใน rate limit      | ใน test ทุก call ที่ error ถูก rollback ด้วย — ต้องเรียกสำเร็จให้ครบจำนวนก่อน (ดู `waitlist.test.sql`)   |
| `pnpm db:*` บน Windows error เรื่อง Docker              | ใช้ `pnpm db:wsl ...` (หัวข้อ 2)                                                                         |
