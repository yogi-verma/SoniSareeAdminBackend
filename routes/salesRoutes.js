import { Router } from 'express';
import { createDailySales, createSalesTransaction, getSalesTransactions } from '../controllers/salesController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);
router.get('/', getSalesTransactions);
router.post('/daily', createDailySales);
router.post('/', createSalesTransaction);

export default router;
