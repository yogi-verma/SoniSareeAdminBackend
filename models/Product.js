import mongoose from 'mongoose';

export const PRODUCT_TYPES = ['saree', 'shut', 'rajputi poshak'];

export const PRODUCT_CATEGORIES = [
  'Banarshi Silk',
  'Kanjiviram Silk',
  'Cotton and Handloom',
  'Georgette & Chiffron',
  'Bandhani'
];

const productSchema = new mongoose.Schema({
  productType: {
    type: String,
    required: [true, 'Product type is required.'],
    enum: {
      values: PRODUCT_TYPES,
      message: `Product type must be one of: ${PRODUCT_TYPES.join(', ')}.`
    }
  },
  category: {
    type: String,
    required: [true, 'Category is required.'],
    enum: {
      values: PRODUCT_CATEGORIES,
      message: `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}.`
    }
  },
  name: {
    type: String,
    required: [true, 'Product name is required.'],
    trim: true,
    maxlength: [120, 'Product name cannot exceed 120 characters.']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required.'],
    min: [0, 'Product price cannot be negative.']
  },
  stock: {
    type: Number,
    required: [true, 'Product stock is required.'],
    min: [0, 'Stock cannot be negative.'],
    validate: {
      validator: Number.isInteger,
      message: 'Stock must be a whole number.'
    }
  },
  photo: {
    url: {
      type: String,
      required: [true, 'Product photo is required.']
    },
    publicId: {
      type: String,
      required: [true, 'Product photo reference is required.']
    }
  }
}, { timestamps: true });

productSchema.index({ productType: 1, category: 1, name: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
