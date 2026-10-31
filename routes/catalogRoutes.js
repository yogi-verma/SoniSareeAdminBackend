import { Router } from 'express';
import { getCatalogProductById, getCatalogProducts } from '../controllers/productController.js';

const router = Router();

// Public, read-only catalog data for the storefront.
router.get('/products', getCatalogProducts);
router.get('/products/:productId', getCatalogProductById);

export default router;
