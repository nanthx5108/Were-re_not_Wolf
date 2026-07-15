import express from 'express';
import cors from 'cors';
import session from 'express-session';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import roomRoutes from './routes/roomRoutes.js';
import authRoutes from './routes/authRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

export const IS_PROD  = process.env.NODE_ENV === 'production';
const SESSION_SECRET  = process.env.SESSION_SECRET || 'wolf-secret-change-in-prod';
const CLIENT_DIST     = path.join(__dirname, '../../client/dist');
const SERVES_CLIENT   = fs.existsSync(CLIENT_DIST);

// dev: vite อยู่คนละ port จึงต้องเปิด CORS ให้ origin ของ vite
// prod: เสิร์ฟ client จาก origin เดียวกัน → ไม่มี cross-origin request
// รองรับหลาย origin คั่นด้วย comma เผื่อวันหลังแยก domain
export const CLIENT_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (IS_PROD) {
  // อยู่หลัง reverse proxy (Render/Railway/nginx) ที่ตัด TLS ให้
  // ถ้าไม่ตั้ง express จะมองว่าเป็น http แล้วไม่ยอมส่ง cookie ที่ secure:true → login ค้างทันที
  app.set('trust proxy', 1);
}

app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
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
    secure:   IS_PROD,
    maxAge:   7 * 24 * 60 * 60 * 1000,
  },
}));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth',  authRoutes);
app.use('/api/rooms', roomRoutes);
// /api/stats/online ถูก register ที่ server.js (ต้องเห็นตัว io) — router นี้ไม่ทับกันเพราะไม่มี /online
app.use('/api/stats', statsRoutes);

// เสิร์ฟ React build จาก origin เดียวกับ API — client เรียก /api/* แบบ relative ได้เลย
// ไม่ต้องตั้ง VITE_API_URL และไม่เจอปัญหา cookie ข้าม site
if (SERVES_CLIENT) {
  app.use(express.static(CLIENT_DIST));

  // react-router เป็น client-side routing — path ที่ไม่ใช่ API ต้องคืน index.html
  // ให้ router ฝั่ง client เป็นคนตัดสิน ไม่งั้น refresh กลางเกมจะได้ 404
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (/^\/(api|uploads|socket\.io|health)\b/.test(req.path)) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(errorHandler);

export default app;