CREATE DATABASE IF NOT EXISTS were_not_wolf
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE were_not_wolf;

CREATE TABLE IF NOT EXISTS rooms (
    id          VARCHAR(8)      NOT NULL PRIMARY KEY,
    name        VARCHAR(64)     NOT NULL,
    host_id     VARCHAR(36)     DEFAULT NULL,
    status      ENUM('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
    max_players TINYINT         NOT NULL DEFAULT 8,
    is_private  BOOLEAN         NOT NULL DEFAULT FALSE,
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
    channel     ENUM('village','werewolf','system') NOT NULL DEFAULT 'village',
    sent_at     TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_messages_room
        FOREIGN KEY (room_id)
        REFERENCES rooms(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_players_room_id   ON players(room_id);
CREATE INDEX idx_players_socket_id ON players(socket_id);
CREATE INDEX idx_messages_room_id  ON messages(room_id);
CREATE INDEX idx_messages_sent_at  ON messages(sent_at);

CREATE TABLE IF NOT EXISTS users (
    id           VARCHAR(36)     NOT NULL PRIMARY KEY,
    username     VARCHAR(32)     NOT NULL UNIQUE,
    password     VARCHAR(255)    NOT NULL,
    games_played INT             NOT NULL DEFAULT 0,
    created_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
 
ALTER TABLE users ADD COLUMN IF NOT EXISTS games_played INT NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;