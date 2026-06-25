import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
} from '../controllers/authController.js';

const router = Router();

router.post('/register', registerHandler);
router.post('/login',    loginHandler);
router.post('/logout',   logoutHandler);
router.get('/me',        meHandler);

export default router;