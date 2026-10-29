import mongoose from 'mongoose';
import Product, { PRODUCT_CATEGORIES, PRODUCT_TYPES } from '../models/Product.js';
import { deleteProductPhoto, uploadProductPhoto } from '../config/cloudinary.js';

const parseProductFields = (body) => {
  const { productType, category, name } = body;
  const price = Number(body.price);
  const stock = Number(body.stock);

  if (typeof productType !== 'string' || !PRODUCT_TYPES.includes(productType)) {
    return { error: `Product type must be one of: ${PRODUCT_TYPES.join(', ')}.` };
  }
  if (typeof category !== 'string' || !PRODUCT_CATEGORIES.includes(category)) {
    return { error: `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}.` };
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Product name is required.' };
  }
  if (name.trim().length > 120) {
    return { error: 'Product name cannot exceed 120 characters.' };
  }
  if (body.price === undefined || body.price === '' || !Number.isFinite(price) || price < 0) {
    return { error: 'Price must be a valid non-negative number.' };
  }
  if (body.stock === undefined || body.stock === '' || !Number.isInteger(stock) || stock < 0) {
    return { error: 'Stock must be a non-negative whole number.' };
  }

  return { fields: { productType, category, name: name.trim(), price, stock } };
};

const isInvalidId = (id) => !mongoose.isValidObjectId(id);

const handleDatabaseError = (res, error, action) => {
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: error.message });
  }

  console.error(`${action} failed:`, error.message);
  return res.status(500).json({ message: `${action} failed.` });
};

export const createProduct = async (req, res) => {
  let uploadedPhoto;
  try {
    const parsed = parseProductFields(req.body ?? {});
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    if (!req.file) return res.status(400).json({ message: 'A product photo is required in the "photo" field.' });

    uploadedPhoto = await uploadProductPhoto(req.file.buffer);
    const product = await Product.create({ ...parsed.fields, photo: uploadedPhoto });

    return res.status(201).json({ message: 'Product created successfully.', product });
  } catch (error) {
    if (uploadedPhoto) {
      try {
        await deleteProductPhoto(uploadedPhoto.publicId);
      } catch (cleanupError) {
        console.error('Could not remove an unlinked product photo:', cleanupError.message);
      }
    }
    return handleDatabaseError(res, error, 'Create product');
  }
};

export const getProducts = async (req, res) => {
  try {
    const { productType, category, search } = req.query;
    const filter = {};

    if (productType) {
      if (!PRODUCT_TYPES.includes(productType)) return res.status(400).json({ message: 'Invalid product type filter.' });
      filter.productType = productType;
    }
    if (category) {
      if (!PRODUCT_CATEGORIES.includes(category)) return res.status(400).json({ message: 'Invalid category filter.' });
      filter.category = category;
    }
    if (search) {
      const escapedSearch = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escapedSearch, $options: 'i' };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ products });
  } catch (error) {
    return handleDatabaseError(res, error, 'Get products');
  }
};

export const getCatalogProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { productType: 'saree' };
    if (category) {
      if (!PRODUCT_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid saree category.' });
      }
      filter.category = category;
    }

    const products = await Product.find(filter)
      .select('productType category name price stock photo.url createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ products });
  } catch (error) {
    return handleDatabaseError(res, error, 'Get saree catalog');
  }
};

export const getProductById = async (req, res) => {
  if (isInvalidId(req.params.productId)) return res.status(400).json({ message: 'Invalid product ID.' });
  try {
    const product = await Product.findById(req.params.productId).lean();
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.status(200).json({ product });
  } catch (error) {
    return handleDatabaseError(res, error, 'Get product');
  }
};

export const updateProduct = async (req, res) => {
  if (isInvalidId(req.params.productId)) return res.status(400).json({ message: 'Invalid product ID.' });

  let uploadedPhoto;
  let oldPhotoPublicId;
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    const parsed = parseProductFields({
      productType: req.body?.productType ?? product.productType,
      category: req.body?.category ?? product.category,
      name: req.body?.name ?? product.name,
      price: req.body?.price ?? product.price,
      stock: req.body?.stock ?? product.stock
    });
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    if (req.file) {
      uploadedPhoto = await uploadProductPhoto(req.file.buffer);
      oldPhotoPublicId = product.photo.publicId;
      product.photo = uploadedPhoto;
    }

    Object.assign(product, parsed.fields);
    await product.save();

    if (oldPhotoPublicId) {
      try {
        await deleteProductPhoto(oldPhotoPublicId);
      } catch (error) {
        console.error('Product updated, but the old photo could not be deleted:', error.message);
      }
    }

    return res.status(200).json({ message: 'Product updated successfully.', product });
  } catch (error) {
    if (uploadedPhoto) {
      try {
        await deleteProductPhoto(uploadedPhoto.publicId);
      } catch (cleanupError) {
        console.error('Could not remove an unlinked product photo:', cleanupError.message);
      }
    }
    return handleDatabaseError(res, error, 'Update product');
  }
};

export const deleteProduct = async (req, res) => {
  if (isInvalidId(req.params.productId)) return res.status(400).json({ message: 'Invalid product ID.' });
  try {
    const product = await Product.findByIdAndDelete(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    try {
      await deleteProductPhoto(product.photo.publicId);
    } catch (error) {
      console.error('Product deleted, but its Cloudinary photo could not be deleted:', error.message);
    }

    return res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return handleDatabaseError(res, error, 'Delete product');
  }
};
