import SalesTransaction, { SALES_TRANSACTION_TYPES } from '../models/SalesTransaction.js';

const parseDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
};

export const createSalesTransaction = async (req, res) => {
  try {
    const { transactionType, amount, description, transactionDate } = req.body ?? {};

    if (!SALES_TRANSACTION_TYPES.includes(transactionType)) {
      return res.status(400).json({ message: 'Transaction type must be online, cash, or expense.' });
    }

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a valid number greater than zero.' });
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ message: 'Description must be a string.' });
    }

    if (transactionType === 'expense' && (typeof description !== 'string' || !description.trim())) {
      return res.status(400).json({ message: 'A description is required for expenses.' });
    }

    let parsedTransactionDate;
    if (transactionDate !== undefined) {
      parsedTransactionDate = parseDateOnly(transactionDate);
      if (!parsedTransactionDate) {
        return res.status(400).json({ message: 'Transaction date must be a valid date in YYYY-MM-DD format.' });
      }
    }

    const transaction = await SalesTransaction.create({
      transactionType,
      amount,
      description: description?.trim() ?? '',
      ...(parsedTransactionDate ? { transactionDate: parsedTransactionDate } : {})
    });

    return res.status(201).json({
      message: 'Sales transaction recorded successfully.',
      transaction
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }

    console.error('Create sales transaction failed:', error.message);
    return res.status(500).json({ message: 'Could not record the sales transaction.' });
  }
};

export const getSalesTransactions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.date !== undefined) {
      const date = parseDateOnly(req.query.date);
      if (!date) {
        return res.status(400).json({ message: 'Date filter must be a valid date in YYYY-MM-DD format.' });
      }

      const nextDay = new Date(date);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      filter.transactionDate = { $gte: date, $lt: nextDay };
    }

    const transactions = await SalesTransaction.find(filter)
      .sort({ transactionDate: -1, createdAt: -1 });

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error('Get sales transactions failed:', error.message);
    return res.status(500).json({ message: 'Could not load sales transactions.' });
  }
};
