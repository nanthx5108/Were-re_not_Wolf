import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OAuth2Client } from 'google-auth-library';
import pool from '../../db/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

const SALT_ROUNDS = 12;
const GAMES_PER_LEVEL = 5;
const USERNAME_COOLDOWN_DAYS = 90;

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL  = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL);

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
      ADD COLUMN IF NOT EXISTS username_changed_at DATETIME DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL UNIQUE
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
  if (!user.password) {
    throw Object.assign(new Error('This account signs in with Google. Use "Sign in with Google" instead.'), { status: 401 });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw Object.assign(new Error('Invalid username or password.'), { status: 401 });
  }

  return toPublicUser(user);
}

async function generateUniqueUsername(base) {
  const cleaned = (base || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()
    .slice(0, 20) || 'player';

  let candidate = cleaned;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [candidate]);
    if (rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${cleaned}${suffix}`;
  }
}

export function getGoogleAuthUrl(state) {
  return googleClient.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
  });
}

export async function loginWithGoogleService(code) {
  await ensureProfileColumns();

  const { tokens } = await googleClient.getToken(code);
  const ticket = await googleClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const { sub: googleId, email, name, picture } = payload;

  const [byGoogleId] = await pool.query(
    'SELECT id, username, games_played, display_name, birthdate, email, avatar_url, username_changed_at FROM users WHERE google_id = ?',
    [googleId]
  );
  if (byGoogleId.length > 0) {
    return toPublicUser(byGoogleId[0]);
  }

  if (email) {
    const [byEmail] = await pool.query(
      'SELECT id, username, games_played, display_name, birthdate, email, avatar_url, username_changed_at FROM users WHERE email = ?',
      [email]
    );
    if (byEmail.length > 0) {
      await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, byEmail[0].id]);
      return toPublicUser(byEmail[0]);
    }
  }

  const id = uuidv4();
  const username = await generateUniqueUsername(name || (email ? email.split('@')[0] : ''));

  await pool.query(
    'INSERT INTO users (id, username, password, google_id, email, display_name, avatar_url) VALUES (?, ?, NULL, ?, ?, ?, ?)',
    [id, username, googleId, email || null, name || null, picture || null]
  );

  return toPublicUser({
    id,
    username,
    games_played: 0,
    display_name: name || null,
    email: email || null,
    avatar_url: picture || null,
  });
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
    'SELECT username, username_changed_at, avatar_url FROM users WHERE id = ?',
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
  if (typeof updates.avatarUrl === 'string' && updates.avatarUrl) {
    fields.push('avatar_url = ?');
    values.push(updates.avatarUrl);

    if (existingUser.avatar_url) {
      const oldPath = path.join(UPLOADS_ROOT, existingUser.avatar_url.replace(/^\/uploads\//, ''));
      fs.unlink(oldPath).catch(() => {});
    }
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