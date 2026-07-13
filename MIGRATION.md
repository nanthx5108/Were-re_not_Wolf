# ย้าย database จาก MySQL local ไป Aiven

Backend อ่านค่า connection จาก env ทั้งหมด จึงใช้ code ชุดเดียวรันได้ทั้ง local และ Aiven
ต่างกันแค่ค่าใน `server/.env`

| env | local (XAMPP/MySQL) | Aiven |
| --- | --- | --- |
| `DB_HOST` | `localhost` | `<service>.aivencloud.com` |
| `DB_PORT` | `3306` | port ของ service (ไม่ใช่ 3306) |
| `DB_USER` | `root` | `avnadmin` |
| `DB_PASSWORD` | (ว่าง) | password จาก Service URI |
| `DB_NAME` | `were_not_wolf` | `defaultdb` หรือ database ที่สร้างเอง |
| `DB_SSL` | `false` | `true` |
| `DB_CA_CERT` | (ว่าง) | path ไปยัง `ca.pem` |

## ขั้นตอน

### 1. เอา Service URI จาก Aiven Console

Aiven Console > เลือก service > **Overview** > ช่อง **Service URI** จะได้หน้าตาแบบนี้

```
mysql://avnadmin:AVNS_xxxxxxxxxxxx@wnw-db-myproject.a.aivencloud.com:24619/defaultdb?ssl-mode=REQUIRED
        └ user ─┘└─── password ───┘└──────────────── host ───────────────┘└ port ┘└ database ┘
```

### 2. แยกใส่ `server/.env`

```env
DB_HOST=wnw-db-myproject.a.aivencloud.com
DB_PORT=24619
DB_USER=avnadmin
DB_PASSWORD=AVNS_xxxxxxxxxxxx
DB_NAME=defaultdb
```

> `ssl-mode=REQUIRED` ท้าย URI ไม่ต้องใส่ใน env — มันคือสิ่งที่ `DB_SSL=true` ทำให้ในขั้นถัดไป

### 3. เปิด SSL + ใส่ CA certificate

```env
DB_SSL=true
DB_CA_CERT=db/ca.pem
```

**ต้องมี CA cert ด้วย ไม่ใช่แค่ `DB_SSL=true`** — Aiven เซ็น certificate ด้วย CA ของ project ตัวเอง
ไม่ใช่ CA สาธารณะที่ Node รู้จัก ถ้าไม่ใส่จะเจอ error `self-signed certificate in certificate chain`

โหลดจาก Aiven Console > Overview > **CA Certificate** (ปุ่ม download) แล้วเซฟเป็น `server/db/ca.pem`
(`*.pem` ถูก gitignore ไว้แล้ว — ตัว CA ไม่ใช่ความลับ แต่ไม่ต้อง commit ก็ได้)

ถ้า host ที่ deploy ตั้ง env เป็นข้อความหลายบรรทัดได้ จะ paste เนื้อ PEM ลง `DB_CA_CERT` ตรง ๆ ก็ได้
`db/config.js` แยกให้เองว่าค่าที่ได้เป็น path หรือเป็นเนื้อ certificate

### 4. สร้างตารางบน Aiven

```bash
cd server
npm run db:migrate
```

script จะ connect ตาม env ปัจจุบัน (SSL ด้วย) แล้วรัน `db/schema.sql` ทั้งไฟล์ จบด้วยการ list ตารางที่มีจริง

```
🔌 connecting to avnadmin@wnw-db-myproject.a.aivencloud.com:24619/defaultdb (SSL: on)
🗂️  schema: 21 statement ถูกรัน, 0 ถูกข้าม (มีอยู่แล้ว) จาก 21
✅ migrate สำเร็จ — ตารางใน "defaultdb": messages, players, rooms, users
```

รันซ้ำได้ปลอดภัย — statement ที่ apply ไปแล้วจะถูกข้าม (`0 ถูกรัน, 21 ถูกข้าม`)

Aiven อาจไม่ให้สิทธิ์ `CREATE DATABASE` ถ้าใช้ database ชื่ออื่นที่ยังไม่มี — ถ้าเจอ warning นั้น
ให้ไปสร้าง database จาก Aiven Console > **Databases** ก่อน แล้วรันใหม่

### 5. ทดสอบการเชื่อมต่อ

```bash
cd server
npm start
```

ถ้าต่อสำเร็จจะขึ้น

```
✅ MySQL connected and schema ready — avnadmin@wnw-db-myproject.a.aivencloud.com:24619/defaultdb (SSL: on)
```

`(SSL: on)` คือตัวยืนยันว่าเชื่อมแบบเข้ารหัสจริง จากนั้นลองสมัคร user ใหม่ในเกมแล้วเช็คว่ามีแถวใน `users`
บน Aiven Console > **Query editor** ก็ได้

## กลับมา dev ที่เครื่องตัวเอง

ตั้งกลับเป็น `DB_SSL=false` (และ host/port/user เดิม) — โค้ดจะไม่ส่ง SSL option เลย
เพราะ MySQL/MariaDB ในเครื่องไม่ได้เปิด TLS ไว้ ถ้าเผลอตั้ง `DB_SSL=true` กับ local จะ handshake ไม่ผ่าน

## ห้าม commit `.env`

`server/.env` ตัวจริงมี password ของ Aiven อยู่ — `.gitignore` ครอบคลุมไว้แล้ว (`.env`)
ตอน deploy ให้ตั้งค่าพวกนี้เป็น environment variable บน host แทนการอัปไฟล์
เช็คได้ด้วย `git check-ignore -v server/.env` (ต้องมี output = ถูก ignore อยู่)

## หมายเหตุเรื่องความต่างของ MariaDB / MySQL

local คือ MariaDB (XAMPP) แต่ Aiven for MySQL คือ MySQL 8 ตัวจริง — `schema.sql` จึงต้องเลี่ยง
syntax เฉพาะของ MariaDB (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`) ซึ่งเป็น
syntax error บน MySQL 8 ความ idempotent ตอนนี้มาจาก `db/runSchema.js` ที่รัน statement ทีละอัน
แล้วข้าม error "มีอยู่แล้ว" (1050/1060/1061) ให้แทน — เวลาเพิ่มคอลัมน์ใหม่ ให้เขียน
`ALTER TABLE ... ADD COLUMN ...` ตรง ๆ ได้เลย
