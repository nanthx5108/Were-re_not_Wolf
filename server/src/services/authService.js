import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection.js';

const SALT_ROUNDS = 12;
const GAMES_PER_LEVEL = 5;
const USERNAME_COOLDOWN_DAYS = 90;

export function calculateLevel(gamesPlayed) {
  return Math.floor((gamesPlayed ?? 0) / GAMES_PER_LEVEL) + 1;
}

async function ensureProfileColumns() {
  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(32) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS birthdate DATE DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS username_changed_at DATETIME DEFAULT NULL
  `);
}

function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    gamesPlayed: user.games_played ?? 0,
    level: calculateLevel(user.games_played),
    displayName: user.display_name ?? null,
    birthdate: user.birthdate ?? '',
    email: user.email ?? '',
    avatarUrl: user.avatar_url ?? null,
    usernameChangedAt: user.username_changed_at ?? null,
  };
}

export async function registerService({ username, password }) {
  const [existing] = await pool.query(
    'SELECT id FROM users WHERE username = ?',
    [username.trim()]
  );
  if (existing.length > 0) {
    throw Object.assign(new Error('Username already taken.'), { status: 409 });
  }

  const id = uuidv4();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  await pool.query(
    'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
    [id, username.trim(), hash]
  );

  return toPublicUser({ id, username: username.trim(), games_played: 0 });
}

export async function loginService({ username, password }) {
  await ensureProfileColumns();

  const [rows] = await pool.query(
    'SELECT id, username, password, games_played, display_name, birthdate, email, avatar_url, username_changed_at FROM users WHERE username = ?',
    [username.trim()]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Invalid username or password.'), { status: 401 });
  }

  const user = rows[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw Object.assign(new Error('Invalid username or password.'), { status: 401 });
  }

  return toPublicUser(user);
}

export async function getUserByIdService(id) {
  await ensureProfileColumns();

  const [rows] = await pool.query(
    'SELECT id, username, games_played, display_name, birthdate, email, avatar_url, username_changed_at FROM users WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return toPublicUser(rows[0]);
}

export async function updateProfileService(id, updates) {
  await ensureProfileColumns();

  const [rows] = await pool.query(
    'SELECT username, username_changed_at FROM users WHERE id = ?',
    [id]
  );
  const existingUser = rows[0];
  if (!existingUser) {
    throw Object.assign(new Error('User not found.'), { status: 404 });
  }

  const nextUsername = updates.username?.trim();
  const currentUsername = existingUser.username;
  const usernameChanged = nextUsername && nextUsername !== currentUsername;

  if (usernameChanged) {
    const lastChangedAt = existingUser.username_changed_at ? new Date(existingUser.username_changed_at) : null;
    const now = new Date();
    const daysSince = lastChangedAt ? Math.floor((now - lastChangedAt) / (1000 * 60 * 60 * 24)) : 0;
    if (daysSince < USERNAME_COOLDOWN_DAYS) {
      const daysLeft = USERNAME_COOLDOWN_DAYS - daysSince;
      throw Object.assign(new Error(`Username can be changed again in ${daysLeft} days.`), { status: 409 });
    }
  }

  const fields = [];
  const values = [];

  if (typeof updates.displayName === 'string') {
    fields.push('display_name = ?');
    values.push(updates.displayName.trim() || null);
  }
  if (typeof updates.birthdate === 'string') {
    fields.push('birthdate = ?');
    values.push(updates.birthdate || null);
  }
  if (typeof updates.email === 'string') {
    fields.push('email = ?');
    values.push(updates.email.trim() || null);
  }
  if (nextUsername && usernameChanged) {
    fields.push('username = ?');
    values.push(nextUsername);
    fields.push('username_changed_at = NOW()');
  }

  if (fields.length === 0) {
    return getUserByIdService(id);
  }

  values.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

  return getUserByIdService(id);
}