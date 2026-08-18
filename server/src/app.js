import express from 'express';
import cors from 'cors';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import roomRoutes from './routes/roomRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const CLIENT_URL     = process.env.CLIENT_URL     || 'http://localhost:5173';
const SESSION_SECRET = process.env.SESSION_SECRET || 'wolf-secret-change-in-prod';

// Cookie sameSite can be configured via env; default to 'lax' for localhost, 'none' for non-localhost in prod
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || (CLIENT_URL.includes('localhost') ? 'lax' : 'none');
const COOKIE_SECURE   = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : (process.env.NODE_ENV === 'production');

// If running behind a proxy (e.g., Render), trust first proxy so secure cookies work
if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Fail fast if session secret is not set in production
if (process.env.NODE_ENV === 'production' && SESSION_SECRET === 'wolf-secret-change-in-prod') {
  console.error('FATAL: SESSION_SECRET is not configured. Set SESSION_SECRET in production environment.');
  // Prevent insecure startup in production
  throw new Error('SESSION_SECRET not configured');
}

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(session({
  name:   'wolf.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: COOKIE_SAMESITE,
    secure:   COOKIE_SECURE,
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));

app.use('/api/auth',  authRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(errorHandler);

export default app;