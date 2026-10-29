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

const purchaseItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Item name is required.'],
    maxlength: [120, 'Item name cannot exceed 120 characters.'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Item description cannot exceed 500 characters.'],
    default: ''
  },
  quantity: {
    type: Number,
    required: [true, 'Item quantity is required.'],
    min: [1, 'Item quantity must be at least one.']
  },
  per_price: {
    type: Number,
    required: [true, 'Item price is required.'],
    min: [0, 'Item price cannot be negative.']
  },
  total: {
    type: Number,
    required: [true, 'Item total is required.'],
    min: [0, 'Item total cannot be negative.']
  }
});

export const PURCHASE_PAYMENT_METHODS = ['cash', 'online', 'cheque'];

const purchasePaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Payment amount is required.'],
    min: [1, 'Payment amount must be greater than zero.']
  },
  method: {
    type: String,
    required: [true, 'Payment method is required.'],
    enum: PURCHASE_PAYMENT_METHODS
  },
  paidAt: {
    type: Date,
    required: true,
    default: Date.now
  }
});

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
  items: {
    type: [purchaseItemSchema],
    default: []
  },
  subtotal: {
    type: Number,
    min: [0, 'Subtotal cannot be negative.'],
    default: 0
  },
  gstPercent: {
    type: Number,
    min: [0, 'GST percentage cannot be negative.'],
    max: [100, 'GST percentage cannot exceed 100.'],
    default: 0
  },
  gstAmount: {
    type: Number,
    min: [0, 'GST amount cannot be negative.'],
    default: 0
  },
  total_price: {
    type: Number,
    required: [true, 'Total price is required.'],
    min: [0, 'Total price cannot be negative.']
  },
  payments: {
    type: [purchasePaymentSchema],
    default: []
  },
  paidAmount: {
    type: Number,
    min: [0, 'Paid amount cannot be negative.'],
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'pending'],
    default: 'pending'
  },
  purchaseDate: {
    type: Date,
    required: [true, 'Purchase date is required.'],
    default: Date.now
  }
}, { timestamps: true });

purchaseSchema.pre('validate', function updatePaymentSummary() {
  const paidAmount = (this.payments ?? []).reduce((total, payment) => total + payment.amount, 0);
  this.paidAmount = paidAmount;
  this.paymentStatus = paidAmount >= this.total_price ? 'paid' : 'pending';
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
