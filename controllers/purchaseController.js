import Purchase from '../models/Purchase.js';

export const createPurchase = async (req, res) => {
  try {
    const { companyName, place, description, category, total_price, purchaseDate } = req.body ?? {};

    if (typeof companyName !== 'string' || !companyName.trim()) {
      return res.status(400).json({ message: 'Company name is required.' });
    }

    if (typeof total_price !== 'number' || !Number.isFinite(total_price)) {
      return res.status(400).json({ message: 'Total price must be a valid number.' });
    }

    let parsedPurchaseDate;
    if (purchaseDate !== undefined) {
      if (typeof purchaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
        return res.status(400).json({ message: 'Purchase date must be a valid date in YYYY-MM-DD format.' });
      }

      parsedPurchaseDate = new Date(`${purchaseDate}T00:00:00.000Z`);
      if (Number.isNaN(parsedPurchaseDate.getTime()) || parsedPurchaseDate.toISOString().slice(0, 10) !== purchaseDate) {
        return res.status(400).json({ message: 'Purchase date must be a valid date in YYYY-MM-DD format.' });
      }
    }

    const purchase = await Purchase.create({
      companyName,
      place,
      description,
      category,
      total_price,
      ...(parsedPurchaseDate ? { purchaseDate: parsedPurchaseDate } : {})
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
