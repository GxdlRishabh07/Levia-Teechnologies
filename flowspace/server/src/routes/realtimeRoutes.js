import { Router } from 'express';
import realtimeController from '../controllers/realtimeController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/auth', requireAuth, realtimeController.authChannel);

export default router;
