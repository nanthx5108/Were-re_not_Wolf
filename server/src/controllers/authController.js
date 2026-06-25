import { registerService, loginService } from '../services/authService.js';

export async function registerHandler(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username?.trim())
      return res.status(400).json({ error: 'Username is required.' });
    if (username.trim().length < 3 || username.trim().length > 32)
      return res.status(400).json({ error: 'Username must be 3–32 characters.' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const user = await registerService({ username, password });

    req.session.userId   = user.id;
    req.session.username = user.username;

    return res.status(201).json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export async function loginHandler(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username?.trim() || !password)
      return res.status(400).json({ error: 'Username and password are required.' });

    const user = await loginService({ username, password });

    req.session.userId   = user.id;
    req.session.username = user.username;

    return res.json({ user: { id: user.id, username: user.username } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

export function logoutHandler(req, res) {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed.' });
    res.clearCookie('wolf.sid');
    return res.json({ ok: true });
  });
}

export function meHandler(req, res) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  return res.json({
    user: { id: req.session.userId, username: req.session.username },
  });
}