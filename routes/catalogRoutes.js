import { Router } from 'express';
import { getCatalogProducts } from '../controllers/productController.js';

const router = Router();

// Public, read-only catalog data for the storefront.
router.get('/products', getCatalogProducts);

export default router;
