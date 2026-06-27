import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection.js';

const SALT_ROUNDS = 12;
const GAMES_PER_LEVEL = 5; // เล่นจบทุกๆ 5 เกม level จะขึ้น 1

export function calculateLevel(gamesPlayed) {
  return Math.floor((gamesPlayed ?? 0) / GAMES_PER_LEVEL) + 1;
}

function toPublicUser({ id, username, games_played }) {
  return {
    id,
    username,
    gamesPlayed: games_played ?? 0,
    level: calculateLevel(games_played),
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

  const id   = uuidv4();
  const hash = await bcrypt.hash(password, SALT_ROUNDS);

  await pool.query(
    'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
    [id, username.trim(), hash]
  );

  return toPublicUser({ id, username: username.trim(), games_played: 0 });
}

export async function loginService({ username, password }) {
  const [rows] = await pool.query(
    'SELECT id, username, password, games_played FROM users WHERE username = ?',
    [username.trim()]
  );

  if (rows.length === 0) {
    throw Object.assign(new Error('Invalid username or password.'), { status: 401 });
  }

  const user  = rows[0];
  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    throw Object.assign(new Error('Invalid username or password.'), { status: 401 });
  }

  return toPublicUser(user);
}

export async function getUserByIdService(id) {
  const [rows] = await pool.query(
    'SELECT id, username, games_played FROM users WHERE id = ?',
    [id]
  );
  if (rows.length === 0) return null;
  return toPublicUser(rows[0]);
}