import { Router } from 'express';
import { addPurchasePayment, createPurchase, getPurchases } from '../controllers/purchaseController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);
router.get('/', getPurchases);
router.post('/', createPurchase);
router.post('/:purchaseId/payments', addPurchasePayment);

export default router;
