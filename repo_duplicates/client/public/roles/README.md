# ภาพการ์ดบทบาท

วางไฟล์ PNG ตามชื่อนี้เป๊ะ ๆ (ตัวพิมพ์เล็กทั้งหมด) — โค้ดอ้างผ่าน `ROLE_INFO[...].card`
ใน `client/src/constants/game.js`

- `villager.png`  — ชาวบ้าน
- `werewolf.png`  — หมาป่า
- `seer.png`      — นักทำนาย
- `bodyguard.png` — บอดี้การ์ด
- `silencer.png`  — นักใบ้
- `fool.png`      — คนบ้า

ไฟล์ในโฟลเดอร์ `public/` ถูกเสิร์ฟที่ `/roles/<ชื่อไฟล์>` ตรง ๆ ไม่ผ่าน bundler
ถ้าไฟล์ไหนหาย การ์ดจะถอยไปแสดงอีโมจิแทนโดยไม่พัง
