import mongoose from 'mongoose';

export const SALES_TRANSACTION_TYPES = ['online', 'cash', 'expense'];

const salesTransactionSchema = new mongoose.Schema({
  transactionType: {
    type: String,
    required: [true, 'Transaction type is required.'],
    enum: {
      values: SALES_TRANSACTION_TYPES,
      message: 'Transaction type must be online, cash, or expense.'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required.'],
    min: [0.01, 'Amount must be greater than zero.']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters.'],
    required: [
      function () { return this.transactionType === 'expense'; },
      'A description is required for expenses.'
    ],
    default: ''
  },
  transactionDate: {
    type: Date,
    required: [true, 'Transaction date is required.'],
    default: Date.now
  }
}, { timestamps: true });

const SalesTransaction = mongoose.model('SalesTransaction', salesTransactionSchema);

export default SalesTransaction;
