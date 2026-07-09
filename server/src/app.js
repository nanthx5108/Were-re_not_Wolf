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
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));

app.use('/api/auth',  authRoutes);
app.use('/api/rooms', roomRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use(errorHandler);

export default app;