import mongoose from 'mongoose';

export const PURCHASE_PLACES = [
  'Charkhi Dardi',
  'Surat',
  'Jaipur',
  'Bhiwani',
  'Rohtak'
];

export const PURCHASE_CATEGORIES = [
  'shut',
  'saree',
  'rajputi poshak'
];

const purchaseSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required.'],
    trim: true
  },
  place: {
    type: String,
    required: [true, 'Place is required.'],
    enum: {
      values: PURCHASE_PLACES,
      message: 'Place must be one of: {VALUES}.'
    }
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Category is required.'],
    enum: {
      values: PURCHASE_CATEGORIES,
      message: 'Category must be one of: {VALUES}.'
    }
  },
  total_price: {
    type: Number,
    required: [true, 'Total price is required.'],
    min: [0, 'Total price cannot be negative.']
  },
  purchaseDate: {
    type: Date,
    required: [true, 'Purchase date is required.'],
    default: Date.now
  }
}, { timestamps: true });

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
