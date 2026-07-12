import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app, { CLIENT_ORIGINS, IS_PROD } from './src/app.js';
import { registerSocketHandlers } from './src/sockets/socketHandlers.js';

const PORT = process.env.PORT || 3001;
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

httpServer.listen(PORT, HOST, () => {
  const where = IS_PROD ? `${HOST}:${PORT}` : `http://localhost:${PORT}`;
  console.log(`🐺 WE'RE not WOLF server → ${where}`);
});