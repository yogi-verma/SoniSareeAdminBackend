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
  const uploadedPhotos = [];
  try {
    const parsed = parseProductFields(req.body ?? {});
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const mainFile = req.files?.photo?.[0];
    const additionalFiles = req.files?.additionalPhotos ?? [];
    if (!mainFile) return res.status(400).json({ message: 'A main product photo is required in the "photo" field.' });

    const uploaded = [];
    for (const file of [mainFile, ...additionalFiles]) {
      const photo = await uploadProductPhoto(file.buffer);
      uploadedPhotos.push(photo);
      uploaded.push(photo);
    }
    const [photo, ...additionalPhotos] = uploaded;
    const product = await Product.create({ ...parsed.fields, photo, additionalPhotos });

    return res.status(201).json({ message: 'Product created successfully.', product });
  } catch (error) {
    await Promise.allSettled(uploadedPhotos.map((photo) => deleteProductPhoto(photo.publicId)));
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
    const { category, ids, search } = req.query;
    const hasPriceFilter = req.query.minPrice !== undefined || req.query.maxPrice !== undefined;
    const productType = req.query.productType || (ids === undefined && !search && !hasPriceFilter ? 'saree' : undefined);
    const filter = {};

    if (productType) {
      if (!PRODUCT_TYPES.includes(productType)) {
        return res.status(400).json({ message: 'Invalid product type filter.' });
      }
      filter.productType = productType;
    }

    if (ids !== undefined) {
      const productIds = String(ids).split(',').filter(Boolean);
      if (productIds.length > 100 || productIds.some((id) => isInvalidId(id))) {
        return res.status(400).json({ message: 'Product IDs must be valid MongoDB IDs (up to 100).'});
      }
      if (!productIds.length) return res.status(200).json({ products: [] });
      filter._id = { $in: productIds };
    }

    if (category) {
      if (!PRODUCT_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Invalid saree category.' });
      }
      filter.category = category;
    }

    if (search !== undefined) {
      const normalizedSearch = String(search).trim().slice(0, 100);
      if (!normalizedSearch) return res.status(400).json({ message: 'Search text cannot be empty.' });
      const searchTokens = normalizedSearch
        .toLocaleLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .map((token) => {
          if (token === 'sarees') return ['saree'];
          if (['suit', 'suits', 'shuts'].includes(token)) return ['shut', 'suit'];
          if (token === 'raputi') return ['rajputi', 'raputi'];
          if (token === 'poshaks') return ['poshak'];
          return [token];
        });
      if (!searchTokens.length) return res.status(400).json({ message: 'Search text must include letters or numbers.' });
      const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const fields = ['name', 'category', 'productType'];
      filter.$and = searchTokens.map((token) => ({
        $or: fields.flatMap((field) => token.map((variant) => ({
          [field]: { $regex: escapeRegex(variant), $options: 'i' }
        })))
      }));
    }

    if (hasPriceFilter) {
      const minPrice = req.query.minPrice === undefined ? undefined : Number(req.query.minPrice);
      const maxPrice = req.query.maxPrice === undefined ? undefined : Number(req.query.maxPrice);
      if ((minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0))
        || (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0))
        || (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)) {
        return res.status(400).json({ message: 'Price filters must be valid non-negative numbers, with minimum no greater than maximum.' });
      }
      filter.price = {
        ...(minPrice !== undefined ? { $gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { $lte: maxPrice } : {})
      };
    }

    const requestedLimit = req.query.limit === undefined ? 12 : Number(req.query.limit);
    const requestedSkip = req.query.skip === undefined ? 0 : Number(req.query.skip);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 24) {
      return res.status(400).json({ message: 'Result limit must be a whole number from 1 to 24.' });
    }
    if (!Number.isInteger(requestedSkip) || requestedSkip < 0 || requestedSkip > 10000) {
      return res.status(400).json({ message: 'Result offset must be a whole number from 0 to 10,000.' });
    }

    const products = await Product.find(filter)
      .select('productType category name price stock photo.url additionalPhotos.url createdAt')
      .sort({ name: 1, createdAt: -1 })
      .skip(requestedSkip)
      .limit(requestedLimit)
      .lean();

    return res.status(200).json({ products });
  } catch (error) {
    return handleDatabaseError(res, error, 'Get saree catalog');
  }
};

export const getCatalogProductById = async (req, res) => {
  if (isInvalidId(req.params.productId)) return res.status(400).json({ message: 'Invalid product ID.' });
  try {
    const product = await Product.findById(req.params.productId)
      .select('productType category name price stock photo.url additionalPhotos.url createdAt')
      .lean();
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    return res.status(200).json({ product });
  } catch (error) {
    return handleDatabaseError(res, error, 'Get catalog product');
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

  const uploadedPhotos = [];
  const oldPhotoPublicIds = [];
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

    const mainFile = req.files?.photo?.[0];
    const additionalFiles = req.files?.additionalPhotos ?? [];
    if (product.additionalPhotos.length + additionalFiles.length > 4) {
      return res.status(400).json({ message: 'A product can have no more than 4 additional photos.' });
    }
    if (mainFile) {
      const photo = await uploadProductPhoto(mainFile.buffer);
      uploadedPhotos.push(photo);
      oldPhotoPublicIds.push(product.photo.publicId);
      product.photo = photo;
    }
    if (additionalFiles.length) {
      const additions = [];
      for (const file of additionalFiles) {
        const photo = await uploadProductPhoto(file.buffer);
        uploadedPhotos.push(photo);
        additions.push(photo);
      }
      product.additionalPhotos.push(...additions);
    }

    Object.assign(product, parsed.fields);
    await product.save();

    await Promise.allSettled(oldPhotoPublicIds.map((publicId) => deleteProductPhoto(publicId)));

    return res.status(200).json({ message: 'Product updated successfully.', product });
  } catch (error) {
    await Promise.allSettled(uploadedPhotos.map((photo) => deleteProductPhoto(photo.publicId)));
    return handleDatabaseError(res, error, 'Update product');
  }
};

export const deleteProduct = async (req, res) => {
  if (isInvalidId(req.params.productId)) return res.status(400).json({ message: 'Invalid product ID.' });
  try {
    const product = await Product.findByIdAndDelete(req.params.productId);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    try {
      await Promise.all([
        deleteProductPhoto(product.photo.publicId),
        ...(product.additionalPhotos ?? []).map((photo) => deleteProductPhoto(photo.publicId))
      ]);
    } catch (error) {
      console.error('Product deleted, but its Cloudinary photo could not be deleted:', error.message);
    }

    return res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    return handleDatabaseError(res, error, 'Delete product');
  }
};
