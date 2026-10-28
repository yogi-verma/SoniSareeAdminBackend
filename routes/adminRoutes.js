import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createAdmin, getLoggedInAdmin, loginAdmin, logoutAdmin } from '../controllers/adminController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' }
});

router.post('/create', createAdmin);
router.post('/login', loginLimiter, loginAdmin);
router.get('/loggedinadmin', requireAdminAuth, getLoggedInAdmin);
router.post('/logoutout', requireAdminAuth, logoutAdmin);
router.post('/logout', requireAdminAuth, logoutAdmin);

export default router;
