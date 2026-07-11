import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  updateProfileHandler,
  googleAuthHandler,
  googleCallbackHandler,
} from '../controllers/authController.js';
import { uploadAvatar } from '../middleware/upload.js';

const router = Router();

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', meHandler);
router.put('/profile', uploadAvatar, updateProfileHandler);
router.get('/google', googleAuthHandler);
router.get('/google/callback', googleCallbackHandler);

export default router;