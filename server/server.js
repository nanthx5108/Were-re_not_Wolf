import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './src/app.js';
import { registerSocketHandlers } from './src/sockets/socketHandlers.js';

const PORT       = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
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

httpServer.listen(PORT, () => {
  console.log(`🐺 WE'RE not WOLF server → http://localhost:${PORT}`);
});