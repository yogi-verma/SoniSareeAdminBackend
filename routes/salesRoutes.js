import { Router } from 'express';
import { createSalesTransaction, getSalesTransactions } from '../controllers/salesController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();

router.use(requireAdminAuth);
router.get('/', getSalesTransactions);
router.post('/', createSalesTransaction);

export default router;
