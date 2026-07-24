# HomePage Spec — WE'RE NOT WOLF

> เอกสารสรุปหน้าแรกตามที่ **มีอยู่จริงในโค้ดตอนนี้** (อ่านจาก `client/pages/HomePage.jsx` 1,083 บรรทัด
> และ `client/src/styles/HomePage.css` 2,015 บรรทัด — commit `5b57317`)
> ใช้เป็น prompt/บรีฟให้คนหรือ AI ทำงานต่อกับหน้านี้ได้ทันทีโดยไม่ต้องเปิดไฟล์

---

## 0. บริบทที่ต้องรู้ก่อน

เกม Social Deduction (หมาป่า) ผู้เล่น 4–8 คน/ห้อง เล่นบนเบราว์เซอร์
Setting: **หมู่บ้านชายฝั่งภาคใต้ไทยสมมติ กลางคืน** — fictional-first ห้ามใช้วัด/ช้าง/ธง/ชุดไทย
Tone: Mystery 40% + Sarcasm 40% + Horror 20% — ข้อความ UI เป็น dry humor ไม่ใช่ emoji/meme
Stack: React + React Router v6 + Custom CSS (ไม่มี framework) + Vite

**กฎเหล็ก:** ทุกสี/ระยะ/เงา/ฟอนต์ต้องอ้าง CSS variable จาก `client/src/styles/global.css` เท่านั้น
ห้ามเขียนเลขสีลอย ๆ ในไฟล์หน้าเพจ

---

## 1. Design tokens ที่หน้านี้ใช้ (จาก global.css)

```
--accent-rgb: 232,169,75      /* #E8A94B — เปลี่ยนค่านี้ค่าเดียว = เปลี่ยนสีเน้นทั้งเว็บ */
--gold-bright #f0ba60  --gold-mid #e8a94b  --gold-dim #cf8a2c  --on-accent #231603
--bg-void #070c11  --bg-base #0a0f14  --bg-elevated #0d131a  --bg-overlay #17212b  --bg-input #0b1218
--border-subtle/-default/-strong   (rgba ขาวอมอุ่น 0.09 / 0.16 / 0.26)
--silver #9fbcd0  --silver-dim #6c808d          /* แสงจันทร์ */
--teal-glow #1a7a7b (+ -soft/-dim)              /* เรืองชีวภาพอันดามัน — ใช้กับ ambient เท่านั้น ห้ามใช้กับปุ่ม */
--text-primary #eef2f4  --text-secondary #b7c2c9  --text-muted #8b97a0  --text-gold #c9b48c
--space-1..8 (4,8,12,16,24,32,48,64)  --radius-sm/md/lg/xl (6,10,16,24)
--shadow-sm/md/lg/gold   --ease 200ms  --ease-md 320ms
```

**ฟอนต์ (สำคัญ — เคยพลาดมาแล้ว):**
| token | ฟอนต์ | ใช้กับ |
|---|---|---|
| `--font-logo` | Cinzel Decorative + Trirong | โลโก้ / form-title เท่านั้น |
| `--font-display` | **Sriracha** | ปุ่ม, หัวข้อ panel |
| `--font-body` | **Sriracha** | เนื้อความ + **ข้อความไทยทุกที่** |
| `--font-meta` | Special Elite | **ละติน/ตัวเลขเท่านั้น** — ฟอนต์นี้ไม่มี glyph ไทย ถ้าใส่ไทยจะตกไปเป็น monospace ระบบ |

Sriracha มีน้ำหนักเดียว → `font-weight: 600/700` ได้ fake bold, `letter-spacing` เกิน ~0.04em ทำให้สระ/วรรณยุกต์ลอย

---

## 2. Signature ภาษาออกแบบของทั้งเว็บ

1. **หมุดไม้เก่า 4 มุม + เรืองอำพันตอน hover** — ไม่ใช่กากบาทกอทิก
   (`radial-gradient(circle at 35% 35%, #7a5a34, #3a2a16 70%)` + `inset` เงาล่าง)
2. **แผ่นไม้แกะ (carved wood)** — พื้นหลัง panel ซ้อน `--wood-grain` (SVG feTurbulence inline) blend `soft-light`
3. **แถบสีกอและ** (`--kolae-stripe`) — ขีดสี 4 ช่วง ทอง/แดงอิฐ/เทียล/ทอง ใต้ปุ่มหลัก
4. **แสงตะเกียงอำพัน** — ทุก hover/active state เรืองด้วย `rgba(var(--accent-rgb), …)`

---

## 3. โครงหน้า (Layout)

```
<div class="home-page" style="background-image: url(bgHome.jpg)">   ← min-height 100dvh, background-size cover
  ├ .home-overlay        (fixed) ไล่เฉดฟ้าคืน 3 ชั้น กดภาพให้จม
  ├ <StarsLayer/>        20 ดวง สุ่มตำแหน่ง (top 0–62%) ระยิบไม่พร้อมกัน
  ├ .home-moonbeams      ลำแสงจันทร์ส่องเฉียงจากมุมซ้ายบน (ตรงกับตำแหน่งพระจันทร์ในภาพ)
  ├ .home-fog            หมอกลอยจากขอบล่าง
  ├ .home-water-shimmer  ประกายผิวน้ำแถบล่างจอ
  ├ .home-lantern-glow   แสงตะเกียงมุมขวาล่าง (เรืองนิ่ง ไม่วูบวาบ)
  ├ <FirefliesLayer/>    หิ่งห้อย 7 ตัว ลอยช้า (transform + opacity เท่านั้น)
  ├ .home-vignette       ขอบมืด
  ├ .home-grain          ฟิล์มเกรน — ให้ทั้งหน้าดูเป็นหนัง
  │
  └ .home-container      max-width 1100px (ขยายเป็น 1400px เมื่อ .is-wide)
      ├ .home-topbar     (fixed) ซ้าย: ป้ายออนไลน์ · ขวา: auth
      ├ .home-header     โลโก้ + ornament    ← ซ่อนตอนเบราว์ห้อง
      └ .home-grid       grid-template-columns: 1fr 0.85fr
          ├ .home-left   เมนู/ฟอร์ม + player bar
          └ .home-right  กระดานประกาศ + ทำเนียบนักล่า   ← ซ่อนตอนเบราว์ห้อง
  .home-footer           version chip + Discord/Facebook
```

### Breakpoints
- `max-width: 820px` → `.home-grid` เหลือคอลัมน์เดียว, โลโก้ `clamp(2.2rem, 10vw, 3.4rem)`
- `max-width: 560px` → ย่อ topbar
- `prefers-reduced-motion` → ปิดชั้นแสงทั้งหมด เหลือภาพนิ่ง (มี 3 บล็อกแยกกันในไฟล์)

---

## 4. State machine ของหน้า

```
mode = null                 → เมนูหลัก 4 ปุ่ม + player bar
mode = 'create'             → ฟอร์มสร้างห้อง
mode = 'join'  joinStep:
    'browse'  → เบราว์ห้อง   ← หน้าเข้าโหมด is-wide: ซ่อนโลโก้ + ซ่อนคอลัมน์ขวา ให้ลิสต์เต็มจอ
    'code'    → กรอกรหัส (เฉพาะห้องส่วนตัว)
    'name'    → กรอกชื่อ แล้วเข้าห้อง
```
ปุ่ม "สร้างห้อง"/"เข้าร่วมห้อง" ถ้ายังไม่ล็อกอินจะเปิด `AuthModal` แทน

---

## 5. ส่วนประกอบทีละบล็อก

### 5.1 Topbar
- **ซ้าย:** `.online-badge` — จุดเขียวเต้น + "ออนไลน์ · N ชาวบ้าน" (poll `/api/stats/online` ทุก **8 วิ**)
  ตั้งใจไม่ใช้ `backdrop-filter` เพราะฉากหลังขยับตลอด จะบังคับเบลอใหม่ทุกเฟรม
- **ขวา (ยังไม่ล็อกอิน):** `เข้าสู่ระบบ` (ghost, เรืองเงินนวล) + `สมัครสมาชิก` (gold)
- **ขวา (ล็อกอินแล้ว):** `.user-pill` = avatar + ชื่อ → dropdown 3 รายการ:
  `ดูข้อมูล` / `ตั้งค่าบัญชี` / `หนีแล้วหรอ?` (logout — ตัวอย่าง tone ที่ต้องการ)
  ปิด dropdown ด้วย mousedown นอกกล่อง

### 5.2 โลโก้ `<TitleLetters/>`
- แยกเป็นตัวอักษรทีละตัว `<span class="title-ch" style="--ch-i: n">` ทยอยลอยขึ้นตามลำดับ
- **Easter egg:** hover คำว่า `WOLF` ครบ **5 ครั้ง** → เส้นใต้ลากจากซ้ายไปขวา ค้าง **20 วินาที** แล้วปลายขวาหดกลับ
- ใต้โลโก้: `.title-ornament` = เส้น–เพชร–เส้น (นิ่ง ไม่มีอนิเมชั่นวาดตัวเอง)

### 5.3 เมนูหลัก `.menu-panel`
4 ปุ่ม `<MenuBtn>` คั่นด้วย `.menu-divider`:

| ปุ่ม | icon | ปลายทาง |
|---|---|---|
| สร้างห้อง (`primary`) | IconCreate | `mode='create'` |
| เข้าร่วมห้อง | IconJoin | `mode='join'` |
| วิธีการเล่น | IconBook | `HowToPlayModal` |
| การตั้งค่า | IconSettings | `/settings` |

โครงปุ่ม: `grid-template-columns: 52px 1fr auto` = ไอคอน / ข้อความ / ลูกศร
ปุ่ม primary มีหมุดมุม `.menu-btn-corner` (tl + br)

### 5.4 ฟอร์มสร้างห้อง
ชื่อของคุณ (32 ตัว) · ชื่อห้อง (64 ตัว) · จำนวนผู้เล่นสูงสุด (select 4–8) · checkbox ห้องส่วนตัว
- hint เปลี่ยนตามสถานะ: เปิด = "เฉพาะผู้ที่ได้รับเชิญเท่านั้น" / ปิด = "คนน่าสงสัยก็เข้าได้เหมือนกัน"
- note: "บทบาทและเวลาแต่ละช่วงตั้งได้ในห้องรอ ก่อนกดเริ่มเกม" — **ไม่ส่ง config ตอนสร้าง** server ใส่ default ตามขนาดห้อง แล้วไปปรับใน Lobby
- `POST /api/rooms` → `setIdentity` → `joinRoom` → `navigate('/lobby/:id')`

### 5.5 เบราว์ห้อง (`joinStep === 'browse'`)
- ช่องค้นหา (ค้นทั้งชื่อห้องและชื่อโฮสต์) + ปุ่มรีเฟรช (ไอคอนหมุนสะสม `refreshSpin += 360`)
- แท็บกรอง 4 อัน: ทั้งหมด / สาธารณะ / ส่วนตัว / ยังไม่เต็ม
- poll `GET /api/rooms` ทุก **5 วิ** (เฉพาะตอนอยู่โหมด join)
- **แถวห้อง `.room-row-rich`** ประกอบด้วย:
  ลำดับ `01` · ไอคอนบ้าน (+ badge ล็อกถ้าเต็ม) · ชื่อห้อง + tag สาธารณะ/ส่วนตัว
  · ป้าย "เกือบเต็มแล้ว · รีบเลย" (เมื่อ ≥75%) หรือ "กำลังเล่น"
  · จุดสีโฮสต์ (วนจาก palette 5 สี ตาม index) + "โฮสต์โดย X"
  · ตัวนับ `N/M` + แถบความเต็ม (สี `is-ok`/`is-near`/`is-full`)
  · ปุ่มเข้าร่วม (disabled เป็น "เต็มแล้ว"/"กำลังเล่น")
- **empty state 2 แบบ:**
  ไม่มีห้องเลย → "หมู่บ้านเงียบสงัด… อาจถึงเวลาที่คุณจะเป็นคนแรกที่จุดตะเกียง"
  กรองแล้วไม่เจอ → "ลองเปลี่ยนตัวกรองหรือคำค้นหาดูอีกครั้ง"

### 5.6 Player bar (มุมซ้ายล่างของคอลัมน์ซ้าย)
- ไม่ล็อกอิน: `AnonymousAvatar` + "ยังไม่ได้เข้าสู่ระบบ" + "เข้าสู่ระบบเพื่อบันทึกเลเวลและสถิติของนาย"
- ล็อกอินแล้ว: avatar (หรือ `DerpyWolfAvatar` หมาป่าหน้าเซ่อ SVG วาดเอง) + ชื่อ + `Lv.N` + `exp/need เกม` + แถบ EXP
- **เลเวลอัป** → `is-levelup` 1.2 วิ (`expLevelUp` + `expTrackFlash`)
- คำนวณจาก `shared/leveling.js` (`expNeeded`, `levelProgress`, `STARTING_LEVEL`)

### 5.7 คอลัมน์ขวา
**กระดานประกาศหมู่บ้าน** (`.panel-box`) — `NEWS` 3 รายการ **hardcode ในไฟล์**
+ กล่อง Developer Note + footer "อัปเดตล่าสุด · วันที่" + ปุ่ม "ดูทั้งหมด" → `/news`
หมุดปักกระดาน `IconPin` โยกตอน hover ทั้งกล่อง

**ทำเนียบนักล่าประจำหมู่บ้าน** — top 5 จาก `/api/stats/leaderboard` (poll ทุก **60 วิ**)
แถว: อันดับ · avatar/อักษรย่อ · ชื่อ · จำนวนเกม · `Lv.N`
3 อันดับแรกได้คลาส `is-gold` / `is-silver` / `is-bronze` · ถ้วยเด้งตอน hover panel
empty: "ยังไม่มีใครสร้างชื่อ… ตำแหน่งแรกรอคุณอยู่" / loading: "กำลังเปิดบันทึกหมู่บ้าน…"

### 5.8 Footer
version chip `v1.2.2` + ปุ่มโซเชียล Discord / Facebook

---

## 6. อนิเมชั่น/ลูกเล่นที่มีแล้ว

| ชื่อ | ทำอะไร |
|---|---|
| `brushDraw` | แถบสีกอและใต้ `.btn-primary` วาดจากซ้ายไปขวาตอน hover (`clip-path`) |
| `fireflyGlow` / `fireflyDrift` | หิ่งห้อยติด-ดับไม่พร้อมกัน + ลอยเฉียง |
| `expLevelUp` / `expTrackFlash` | แถบ EXP วาบตอนเลเวลอัป |
| entrance sequence | `entrance-page` → `entrance-logo` (300ms) → `entrance-menu` (700ms) → `entrance-news` (950ms) |
| hover ทั่วไป | หมุดมุมสว่าง · panel ยกตัว · ถ้วยเด้ง · หมุดโยก · วงแหวนทองรอบ avatar |

**เสียงยังปิดอยู่:** `BGM_SRC` และ `HOVER_SFX_SRC` เป็น `null` — โค้ดเล่นเพลงวน (volume 0.35, resume หลัง user click แรก)
และเสียง hover (clone node, volume 0.4) เขียนครบแล้ว รอแค่ใส่ path ไฟล์

---

## 7. Endpoints ที่หน้านี้เรียก

| endpoint | method | ความถี่ | ใช้ทำ |
|---|---|---|---|
| `/api/rooms` | GET | 5 วิ (โหมด join) | ลิสต์ห้อง |
| `/api/rooms` | POST | on submit | สร้างห้อง (ส่ง `credentials: 'include'`) |
| `/api/rooms/:code/join` | POST | on submit | เข้าร่วมห้อง |
| `/api/stats/online` | GET | 8 วิ | จำนวนคนออนไลน์ |
| `/api/stats/leaderboard` | GET | 60 วิ | ทำเนียบนักล่า |

ทุก fetch ที่ poll ใช้ pattern `let cancelled` + `clearInterval` ใน cleanup และ **fail เงียบ** (`catch { /* silent */ }`)

---

## 8. Feedback ที่ยังไม่ได้แก้ (งานที่รออยู่)

เจ้าของโปรเจกต์รีวิวว่าหน้านี้:
- **ดูเหมือนเว็บทำงาน (SaaS) ไม่เหมือนเกม** — ขาดความรู้สึก "มือทำ"
- **แข็งทื่อ** — spacing/layout จัดแบบ generic เกินไป
- **สีใช้ไม่ดี** — ต้องพิจารณาใหม่ (ไม่ใช่เพิ่มสี แต่ใช้ให้ถูกจุด/ถูกน้ำหนัก)
- **UX/UI ไม่รู้สึกเหมือนมีคนออกแบบเอง** — เป็น template/AI-generic
- ยังขาด texture, รายละเอียดเล็ก ๆ, **ความไม่สมมาตร**

แนวที่ใช้แก้ปัญหาเดียวกันนี้ในหน้า Lobby แล้วได้ผล (อ้างอิงได้):
ลายไม้ blend `soft-light` บน panel · หมุดไม้ 4 มุมแทนวงเล็บทอง · เอียง panel คนละ 0.2–0.6°
· ฟิล์มเกรนทับทั้งจอ · หัวข้อแกะลงเนื้อไม้ (เงาบนมืด/ล่างสว่าง) · เส้นคั่นเป็น element จริงไม่ใช่ตัวอักษร

---

## 9. หนี้เทคนิคที่ควรเก็บ

1. `MenuBtn` ถูกเรียกพร้อม prop `emoji="🏠"` ทั้ง 4 ปุ่ม แต่ signature ไม่รับ prop นี้ → dead prop
2. Fragment ว่างเปล่าที่ `HomePage.jsx:750-753` — `{joinStep !== 'browse' && (<></>)}` ไม่ทำอะไรเลย
3. `NEWS` hardcode ในไฟล์ ทั้งที่มีหน้า `/news` แยก → ข่าวเปลี่ยนต้องแก้ 2 ที่
4. ไฟล์เดียว 1,083 บรรทัด โดย ~200 บรรทัดเป็น SVG icon 18 ตัว → แยกเป็น `components/icons.jsx` ได้
5. `.custom-scrollbar` นิยามอยู่ใน `HomePage.css` แต่ถูกใช้ในหน้าอื่นด้วย → ควรย้ายไป `global.css`

---

## 10. ข้อควรระวังเวลาแก้ไฟล์นี้

- `animation-fill-mode: both` + `:hover { transform }` บน element เดียวกัน = hover ไม่ขยับ
  (animation ทับ) ให้ใช้ `backwards` แทน หรือเอา transform ปลายทางไปไว้ใน keyframe
- ห้ามใส่ `backdrop-filter` บนอะไรที่ลอยเหนือฉากหลังที่ขยับ — บังคับ re-blur ทุกเฟรม
- ชั้นบรรยากาศทั้งหมดต้อง `pointer-events: none` และใช้แค่ `transform`/`opacity`
- `.top-btn` ตั้งชื่อ class เฉพาะหน้านี้เพื่อไม่ให้ชนกับ `.auth-btn` ใน `Auth.css`
