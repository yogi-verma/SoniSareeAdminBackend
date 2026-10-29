import { Router } from 'express';
import multer from 'multer';
import {
  createProduct,
  deleteProduct,
  getProductById,
  getProducts,
  updateProduct
} from '../controllers/productController.js';
import requireAdminAuth from '../middleware/requireAdminAuth.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(new Error('Product photo must be an image file.'));
    }
    return callback(null, true);
  }
});

function handlePhotoUpload(req, res, next) {
  upload.single('photo')(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Product photo must be 5 MB or smaller.'
      : error.message || 'Could not process the product photo.';
    return res.status(400).json({ message });
  });
}

router.use(requireAdminAuth);
router.get('/', getProducts);
router.get('/:productId', getProductById);
router.post('/', handlePhotoUpload, createProduct);
router.patch('/:productId', handlePhotoUpload, updateProduct);
router.delete('/:productId', deleteProduct);

export default router;
