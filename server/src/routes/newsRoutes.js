import { Router } from 'express';
import { getPublicNews } from '../controllers/newsController.js';

const router = Router();

// Publicly accessible news feed
router.get('/', getPublicNews);

export default router;