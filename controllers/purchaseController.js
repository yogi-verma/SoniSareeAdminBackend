import Purchase from '../models/Purchase.js';

const roundMoney = (amount) => Math.round(amount);

const isValidPurchaseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export const createPurchase = async (req, res) => {
  try {
    const { companyName, place, description = '', category, items, gstPercent = 0, purchaseDate } = req.body ?? {};

    if (typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ message: 'Company name is required.' });
    }

    if (!Array.isArray(items) || items.length < 1) {
      return res.status(400).json({ message: 'Add at least one purchase item.' });
    }

    if (typeof description !== 'string') {
      return res.status(400).json({ message: 'Purchase description must be a string.' });
    }

    if (typeof gstPercent !== 'number' || !Number.isFinite(gstPercent) || gstPercent < 0 || gstPercent > 100) {
      return res.status(400).json({ message: 'GST percentage must be between 0 and 100.' });
    }

    if (purchaseDate !== undefined && !isValidPurchaseDate(purchaseDate)) {
      return res.status(400).json({ message: 'Purchase date must be a valid date in YYYY-MM-DD format.' });
    }

    const normalizedItems = [];
    for (const [index, item] of items.entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return res.status(400).json({ message: `Item ${index + 1} is invalid.` });
      }

      const { name, description: itemDescription = '', quantity, per_price } = item;
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: `Name is required for item ${index + 1}.` });
      }
      if (typeof itemDescription !== 'string') {
        return res.status(400).json({ message: `Description for item ${index + 1} must be a string.` });
      }
      if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({ message: `Quantity for item ${index + 1} must be a positive whole number.` });
      }
      if (typeof per_price !== 'number' || !Number.isFinite(per_price) || per_price < 0) {
        return res.status(400).json({ message: `Per-item price for item ${index + 1} must be a valid non-negative number.` });
      }

      normalizedItems.push({
        name: name.trim(),
        description: itemDescription.trim(),
        quantity,
        per_price: roundMoney(per_price),
        total: roundMoney(quantity * per_price)
      });
    }

    const subtotal = roundMoney(normalizedItems.reduce((total, item) => total + item.total, 0));
    const gstAmount = roundMoney(subtotal * gstPercent / 100);
    const total_price = roundMoney(subtotal + gstAmount);

    if (![subtotal, gstAmount, total_price].every(Number.isSafeInteger)) {
      return res.status(400).json({ message: 'Purchase amounts are too large to process safely.' });
    }

    const purchase = await Purchase.create({
      companyName,
      place,
      description,
      category,
      items: normalizedItems,
      subtotal,
      gstPercent,
      gstAmount,
      total_price,
      ...(purchaseDate ? { purchaseDate: new Date(`${purchaseDate}T00:00:00.000Z`) } : {})
    });

    return res.status(201).json({
      message: 'Purchase recorded successfully.',
      purchase
    });
  } catch (error) {
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }

    console.error('Create purchase failed:', error.message);
    return res.status(500).json({ message: 'Could not record the purchase.' });
  }
};

export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ purchaseDate: -1, createdAt: -1 });
    return res.status(200).json({ purchases });
  } catch (error) {
    console.error('Get purchases failed:', error.message);
    return res.status(500).json({ message: 'Could not load purchases.' });
  }
};
