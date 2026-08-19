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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express(); 

export const IS_PROD  = process.env.NODE_ENV === 'production';
const SESSION_SECRET  = process.env.SESSION_SECRET || 'wolf-secret-change-in-prod';
const CLIENT_DIST     = path.join(__dirname, '../../client/dist');
const SERVES_CLIENT   = fs.existsSync(CLIENT_DIST);

export const CLIENT_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (IS_PROD) {
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

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
}));

app.use('/api/auth',  authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/news',  newsRoutes);

if (SERVES_CLIENT) {
  app.use(express.static(CLIENT_DIST));

  app.use((req, res, next) => {
    if (req.method !== 'GET') return next();
    if (/^\/(api|uploads|socket\.io|health)\b/.test(req.path)) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app, { CLIENT_ORIGINS, IS_PROD, sessionMiddleware } from './src/app.js';
import { registerSocketHandlers } from './src/sockets/socketHandlers.js';
import { purgeStaleRoomsOnStartup, startRoomSweep } from './src/game/roomMaintenance.js';

const PORT = process.env.PORT || 3002; // Changed from 3001 to 3002 to fix EADDRINUSE
// PaaS ส่วนใหญ่ health-check ผ่าน IP ภายใน — ผูกกับ 0.0.0.0 ไม่ใช่ localhost ไม่งั้นถูกมองว่าตาย
const HOST = process.env.HOST || '0.0.0.0';

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// แชร์ express-session เดียวกับฝั่ง REST เข้ามาที่ socket handshake —
// ทำให้ socket.request.session.userId ใช้เช็คสิทธิ์แอดมินได้แบบเชื่อถือได้จริง
// (ไม่ใช่เชื่อ flag ที่ client ส่งมาตรงๆ ซึ่งปลอมได้)
io.engine.use(sessionMiddleware);

io.on('connection', socket => {
  console.log(`[socket] connected: ${socket.id}`);
  registerSocketHandlers(socket, io);
  socket.on('disconnect', () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

app.get('/api/stats/online', (_req, res) => {
  res.json({ online: io.engine.clientsCount });
});

// ล้างห้องผีที่ค้างจาก process ก่อนหน้า แล้วเปิดตัวกวาดห้องร้างเป็นระยะ
await purgeStaleRoomsOnStartup();
startRoomSweep();

httpServer.listen(PORT, HOST, () => {
  const where = IS_PROD ? `${HOST}:${PORT}` : `http://localhost:${PORT}`;
  console.log(`🐺 WE'RE not WOLF server → ${where}`);
});