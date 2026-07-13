-- schema ของ WE'RE NOT WOLF — ต้องรันได้ทั้ง MariaDB (local/XAMPP) และ MySQL 8 (Aiven)
--
-- ข้อควรรู้ก่อนแก้ไฟล์นี้:
--  1. ห้ามใส่ CREATE DATABASE / USE — database มาจาก env DB_NAME และถูกเลือกไว้ตั้งแต่ตอน connect
--  2. ห้ามใช้ `ADD COLUMN IF NOT EXISTS` หรือ `CREATE INDEX IF NOT EXISTS`
--     เป็น syntax เฉพาะของ MariaDB และเป็น syntax error บน MySQL 8
--     ความ idempotent มาจาก db/runSchema.js ที่ข้าม error 1050/1060/1061 (มีอยู่แล้ว) ให้แทน
--     → เขียน ALTER/CREATE INDEX ตรง ๆ ได้เลย รันซ้ำกี่รอบก็ปลอดภัย

CREATE TABLE IF NOT EXISTS rooms (
    id          VARCHAR(8)      NOT NULL PRIMARY KEY,
    name        VARCHAR(64)     NOT NULL,
    host_id     VARCHAR(36)     DEFAULT NULL,
    status      ENUM('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
    max_players TINYINT         NOT NULL DEFAULT 8,
    is_private  BOOLEAN         NOT NULL DEFAULT FALSE,
    config      JSON            DEFAULT NULL,
    created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
    id          VARCHAR(36)     NOT NULL PRIMARY KEY,
    room_id     VARCHAR(8)      NOT NULL,
    nickname    VARCHAR(32)     NOT NULL,
    role        VARCHAR(30)     DEFAULT NULL,
    is_alive    BOOLEAN         NOT NULL DEFAULT TRUE,
    socket_id   VARCHAR(64)     DEFAULT NULL,
    joined_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_players_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
    id          INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    room_id     VARCHAR(8)      NOT NULL,
    player_id   VARCHAR(36)     NOT NULL,
    nickname    VARCHAR(32)     NOT NULL,
    content     TEXT            NOT NULL,
    channel     ENUM('village','werewolf','system','dead') NOT NULL DEFAULT 'village',
    sent_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_messages_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
    id                 VARCHAR(36)     NOT NULL PRIMARY KEY,
    username           VARCHAR(32)     NOT NULL UNIQUE,
    password           VARCHAR(255)    DEFAULT NULL,
    games_played       INT             NOT NULL DEFAULT 0,
    exp                INT             NOT NULL DEFAULT 0,
    level              INT             NOT NULL DEFAULT 0,
    display_name       VARCHAR(32)     DEFAULT NULL,
    birthdate          DATE            DEFAULT NULL,
    email              VARCHAR(255)    DEFAULT NULL,
    avatar_url         VARCHAR(500)    DEFAULT NULL,
    username_changed_at DATETIME       DEFAULT NULL,
    google_id          VARCHAR(255)    DEFAULT NULL UNIQUE,
    created_at         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_room_id   ON players(room_id);
CREATE INDEX idx_players_socket_id ON players(socket_id);
CREATE INDEX idx_messages_room_id  ON messages(room_id);
CREATE INDEX idx_messages_sent_at  ON messages(sent_at);
CREATE INDEX idx_users_username    ON users(username);

-- migration สำหรับ database เดิมที่สร้างไว้ก่อนคอลัมน์พวกนี้จะมี
-- (บน database ใหม่ CREATE TABLE ข้างบนครอบคลุมแล้ว → statement พวกนี้จะโดนข้ามด้วย error 1060)
ALTER TABLE users ADD COLUMN games_played INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN display_name VARCHAR(32) DEFAULT NULL;
ALTER TABLE users ADD COLUMN birthdate DATE DEFAULT NULL;
ALTER TABLE users ADD COLUMN email VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL;
ALTER TABLE users ADD COLUMN username_changed_at DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) DEFAULT NULL UNIQUE;
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) DEFAULT NULL;
ALTER TABLE rooms ADD COLUMN is_private BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN config JSON DEFAULT NULL;

-- ห้องแชทของคนตาย — database เดิมมี enum แค่ 3 ค่า ต้องขยายก่อนถึงจะบันทึกได้
ALTER TABLE messages MODIFY COLUMN channel ENUM('village','werewolf','system','dead') NOT NULL DEFAULT 'village';

-- ระบบเลเวล: ผู้เล่นใหม่เริ่มที่ Lv.0 exp 0 (ไม่ใช่ Lv.1)
-- ตารางเดิมอาจมีคอลัมน์ level ที่ default เป็น 1 อยู่ จึงบังคับ default ใหม่ด้วย MODIFY
ALTER TABLE users ADD COLUMN exp INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN level INT NOT NULL DEFAULT 0;
ALTER TABLE users MODIFY COLUMN exp INT NOT NULL DEFAULT 0;
ALTER TABLE users MODIFY COLUMN level INT NOT NULL DEFAULT 0;
UPDATE users SET level = 0 WHERE games_played = 0;
