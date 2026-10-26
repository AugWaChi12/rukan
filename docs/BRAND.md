# BRAND.md — อัตลักษณ์แบรนด์ โลโก้ ไอคอน และระบบ UI ของ "รู้กัน (rukan)"

> **กฎสำหรับ AI / Developer ทุกคนที่แตะ UI, โลโก้, ไอคอน หรือหน้าแสดงแพ็กเกจ:**
> แอป **รู้กัน (rukan)** ใช้ชุดโลโก้และไอคอนที่ออกแบบขึ้นเฉพาะของแบรนด์เราเอง (**ห้ามใช้ไอคอนค่าเริ่มต้นของ Expo หรือไอคอนโหลที่ไม่เข้าชุด**)

---

## 1. โลโก้หลักของแบรนด์ (Signature Logo)

คอนเซปต์หลักคือ **"Twin Soul Bubbles (สองฟองที่รู้กัน)"**:

- ฟองคำพูดสองฟองหันเข้าหากัน: ฝั่งซ้ายสีชมพูพาสเทล (`Rose #E9A9BF`) และฝั่งขวาสีม่วงลาเวนเดอร์ (`Lilac #C7BEE3`) พร้อมเส้นแสงสะท้อนขอบแก้ว (Liquid Glass Highlight)
- **พื้นที่ที่สองฟองซ้อนทับกันตรงกลาง** (`Deep Plum #2E2238`) สื่อถึง _"พื้นที่ที่รู้กันแค่เราสองคน"_
- ตรงกลางส่วนที่ซ้อนทับมี **ประกายดาว 4 แฉกสีทอง (`Gold #F2C66D`)**

### ตำแหน่งไฟล์โลโก้ในโปรเจค

| จุดใช้งาน                                  | ไฟล์ใน Repo                                                                                                                                                                      | หมายเหตุ                                                           |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- |
| **Web Navbar / Footer**                    | [`apps/web/src/components/landing/icons.tsx`](../apps/web/src/components/landing/icons.tsx) (`LogoMark`)                                                                         | SVG คมชัดทุกขนาด มีไฮไลต์แก้วและดาวทองตรงกลาง                      |
| **Mobile App Icon (iOS / Android)**        | [`apps/mobile/assets/expo.icon/Assets/expo-symbol 2.svg`](../apps/mobile/assets/expo.icon/Assets/expo-symbol%202.svg) + [`icon.json`](../apps/mobile/assets/expo.icon/icon.json) | เปลี่ยนจากสามเหลี่ยม Expo เดิมเป็น Twin Soul Bubbles ของรู้กันแล้ว |
| **Figma Vector Kit (3 Concepts)**          | [`docs/brand/svg/`](./brand/svg/)                                                                                                                                                | แยกเลเยอร์ `<g id="...">` พร้อมลากหรือก๊อปวาง (`Ctrl+V`) ใน Figma  |
| **หน้าสตูดิโอพรีวิว & กด Copy เข้า Figma** | [`apps/web/src/app/(th)/brand/page.tsx`](<../apps/web/src/app/(th)/brand/page.tsx>) (URL: `/brand`)                                                                              | มีปุ่ม **Copy SVG to Figma** และดาวน์โหลด `.SVG` ทุกชิ้น           |

---

## 2. ชุดไอคอนเฉพาะของแอป (`docs/brand/svg/`)

ทุกไฟล์วาดบน Vector Grid `64×64` แยกเลเยอร์สำหรับ Figma และพร้อมนำไปใช้ใน Web / Mobile:

### 2.1 ไอคอนแถบเมนูหลัก 4 แท็บ (Bottom Navigation)

- **Space (`พื้นที่นามแฝง`)**: [`docs/brand/svg/icon-tab-space.svg`](./brand/svg/icon-tab-space.svg) — ดาวเคราะห์วงแหวน + ประกายดาวกระซิบ
- **Drop / ปัด (`Swipe Deck`)**: [`docs/brand/svg/icon-tab-drop.svg`](./brand/svg/icon-tab-drop.svg) — การ์ดคู่ปัดซ้าย/ขวา + ฟองหัวใจลอยขึ้น
- **แชท (`Chats`)**: [`docs/brand/svg/icon-tab-chats.svg`](./brand/svg/icon-tab-chats.svg) — ฟองแชทคู่ซ้อนกันพร้อมดาว 4 แฉกตรงกลาง
- **ฉัน (`Me`)**: [`docs/brand/svg/icon-tab-me.svg`](./brand/svg/icon-tab-me.svg) — โปรไฟล์วงแหวนออร่า + ตราดาวรับรองตัวจริง

### 2.2 ไอคอนระบบเหรียญ & แพ็กเกจสมาชิก 3 ระดับ

- **Rukan Coin (`🪙`)**: [`docs/brand/svg/icon-rukan-coin.svg`](./brand/svg/icon-rukan-coin.svg) — เหรียญทองปั๊มนูนสัญลักษณ์สองฟองรู้กันตรงกลาง
- **Free Tier (`🌱 ผู้ใช้ทั่วไป`)**: [`docs/brand/svg/icon-pass-free.svg`](./brand/svg/icon-pass-free.svg) — ต้นอ่อนใบคู่ในกรอบเขียวมิ้นต์ Sage (`#2C6B52` / `#E8F4EE`)
- **Gold Pass (`🥇 สายป๊อป โอกาสแมตช์สูง`)**: [`docs/brand/svg/icon-pass-gold.svg`](./brand/svg/icon-pass-gold.svg) — มงกุฎทองประดับพลอยชมพู (`#F2C66D` / `#FFF6DC`)
- **Premium Pass (`💎 VIP + ผู้ช่วย AI ส่วนตัว`)**: [`docs/brand/svg/icon-pass-premium.svg`](./brand/svg/icon-pass-premium.svg) — เพชรเจียระไนบนพื้นม่วงรัตติกาล + ประกายดาว AI Wingman

### 2.3 ไอคอนฟีเจอร์เอกลักษณ์

- **ฟองทัก (`Greeting Bubble`)**: [`docs/brand/svg/icon-feature-bubble.svg`](./brand/svg/icon-feature-bubble.svg)
- **เปิดเผยรูปโปรไฟล์ 3 ขั้น (`Progressive Reveal`)**: [`docs/brand/svg/icon-feature-reveal.svg`](./brand/svg/icon-feature-reveal.svg)

---

## 3. แนวทางดีไซน์ UI สำคัญที่ห้ามทำหาย

1. **แถบเมนูด้านล่างแบบ Instagram Liquid Glass (`apps/mobile`)**
   - อยู่ที่ [`apps/mobile/src/app/(app)/(tabs)/_layout.tsx`](<../apps/mobile/src/app/(app)/(tabs)/_layout.tsx>)
   - เป็นแคปซูลลอยตัว (`position: 'absolute'`, `borderRadius: 999`) โปร่งแสง มีขอบเงาแก้วด้านบน แสดงเฉพาะไอคอนพร้อมแคปซูลไฮไลต์แท็บที่เลือก และมีจุดแจ้งเตือนสีชมพู (`#D4688E`) ที่แท็บแชทเมื่อมีข้อความยังไม่อ่าน
   - `Screen` ใน [`apps/mobile/src/components/ui.tsx`](../apps/mobile/src/components/ui.tsx) เผื่อระยะ `paddingBottom` สำหรับแท็บลอยตัวไว้แล้ว ห้ามลบออก
2. **หน้าเว็บ (`apps/web`) ต้องสวยครบทั้งบนคอมและมือถือ (Responsive Mobile)**
   - ส่วน Hero ใน [`apps/web/src/components/landing/phones.tsx`](../apps/web/src/components/landing/phones.tsx) ต้องแสดง **ครบทั้ง 3 หน้าจอมือถือ + ป้ายแจ้งเตือนลอยตัวทั้ง 3 จุด** ทั้งบนจอคอมและจอมือถือ (ใช้ responsive scale stage ห้ามใส่ `hidden md:block` ซ่อนเครื่องซ้าย-ขวาบนมือถืออีก)
   - Navbar ด้านบนใช้ดีไซน์แคปซูล Liquid Glass ติดขอบบน (`sticky top-3 z-40 backdrop-blur-xl`)
