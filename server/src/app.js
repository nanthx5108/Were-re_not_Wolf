import express from 'express';
import cors from 'cors';
import roomRoutes from './routes/roomRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/rooms', roomRoutes);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

export default app;