import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import roomRoutes from './routes/roomRoutes.js';
import authRoutes from './routes/authRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import pool from '../db/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express(); 

export const IS_PROD  = process.env.NODE_ENV === 'production';
const SESSION_SECRET  = process.env.SESSION_SECRET || 'wolf-secret-change-in-prod';
const CLIENT_DIST     = path.join(__dirname, '../../client/dist');
const SERVES_CLIENT   = fs.existsSync(CLIENT_DIST);

export const CLIENT_ORIGINS = (() => {
  if (process.env.CLIENT_URL) return process.env.CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean);
  // If the server is serving the built client files, assume the client will be same-origin in prod.
  // Returning an empty array signals the CORS setup below to allow dynamic origins (useful on PaaS like Render).
  if (SERVES_CLIENT) return [];
  return ['http://localhost:5173'];
})();

if (IS_PROD) {
  app.set('trust proxy', 1);
}

// Configure CORS: if CLIENT_ORIGINS is non-empty, use it. If empty, allow dynamic origins (helps when serving client from same host on Render).
const corsOptions = { credentials: true };
if (CLIENT_ORIGINS.length) {
  corsOptions.origin = CLIENT_ORIGINS;
} else {
  corsOptions.origin = (origin, callback) => callback(null, true);
}

app.use(cors(corsOptions));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

export const sessionMiddleware = session({
  name:   'wolf.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure:   IS_PROD,
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
});

app.use(sessionMiddleware);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/keepalive', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('Server and Database are awake!');
  } catch (error) {
    console.error('[keepalive] Database connection error:', error);
    res.status(500).send('Database connection error');
  }
});

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
}));
app.use('/api/news', newsRoutes);
app.use('/api/auth',  authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

if (SERVES_CLIENT) {
  app.use(express.static(CLIENT_DIST));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (/^\/(api|uploads|socket\.io|health|keepalive)\b/.test(req.path)) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(errorHandler);

export default app;