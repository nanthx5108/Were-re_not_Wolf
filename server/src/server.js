import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/authRoutes.js';
import newsRoutes from './routes/newsRoutes.js'; // Import news routes
import './services/gameSettingsService.js'; // Import to load game settings on startup
import * as gameDataService from './services/gameDataService.js'; // Import to ensure it loads game data on startup
import adminRoutes from './routes/adminRoutes.js'; // 1. Import admin routes

// สมมติว่ามีการตั้งค่า session และ middleware อื่นๆ ที่นี่
// import sessionMiddleware from './middleware/session.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { /* ... CORS config ... */ });

app.set('io', io); // ทำให้เข้าถึง io จาก controller ได้

app.use(express.json());
// app.use(sessionMiddleware);

// ... other routes
app.use('/api/auth', authRoutes);
app.use('/api/news', newsRoutes); // Public news API
app.use('/api/admin', adminRoutes); // 2. นำ admin routes มาใช้งาน

// ... socket.io connection handling

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});