import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../../db/connection.js';

const SALT_ROUNDS = 12;

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

  return { id, username: username.trim() };
}

export async function loginService({ username, password }) {
  const [rows] = await pool.query(
    'SELECT id, username, password FROM users WHERE username = ?',
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

  return { id: user.id, username: user.username };
}