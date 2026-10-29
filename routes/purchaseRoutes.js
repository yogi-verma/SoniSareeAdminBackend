import { Router } from 'express';
import { createPurchase, getPurchases } from '../controllers/purchaseController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);
router.get('/', getPurchases);
router.post('/', createPurchase);

export default router;
