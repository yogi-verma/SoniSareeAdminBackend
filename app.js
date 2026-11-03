import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/healthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import salesRoutes from './routes/salesRoutes.js';
import productRoutes from './routes/productRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
import connectDB from './config/database.js';
import Product from './models/Product.js';
import InventorySale from './models/InventorySale.js';

const app = express();
const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      return origin.replace(/\/+$/, '');
    }
  });
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  ...configuredOrigins
]);

const isAllowedOrigin = (origin) => {
  if (!origin || allowedOrigins.has(origin)) return true;

  try {
    const { hostname, protocol } = new URL(origin);
    return protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1');
  } catch {
    return false;
  }
};

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Vercel serves this Express app directly and does not run server.js first.
// Connect here so database-backed routes work in both Vercel and local runs.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    return res.status(503).json({
      status: 'database unavailable',
      database: 'disconnected'
    });
  }
});

app.use('/api/health', healthRoutes);
app.use('/', adminRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/products', productRoutes);
app.use('/api/catalog', catalogRoutes);

app.post('/api/internal/inventory/sales', async (req, res) => {
  const expectedKey = process.env.ADMIN_ORDERS_API_KEY;
  if (!expectedKey || req.get('x-inventory-sync-key') !== expectedKey) {
    return res.status(401).json({ message: 'Unauthorized inventory sync.' });
  }

  const { orderId, items } = req.body ?? {};
  if (typeof orderId !== 'string' || !orderId || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: 'Order ID and purchased items are required.' });
  }

  const normalizedItems = [];
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !/^[a-f\d]{24}$/i.test(item.productId)
      || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return res.status(400).json({ message: 'Each purchased item needs a valid product ID and positive quantity.' });
    }
    normalizedItems.push({ productId: item.productId, quantity: item.quantity });
  }

  const session = await Product.startSession();
  try {
    let alreadyApplied = false;
    await session.withTransaction(async () => {
      const priorSale = await InventorySale.findOne({ orderId }).session(session);
      if (priorSale) {
        alreadyApplied = true;
        return;
      }

      for (const item of normalizedItems) {
        const product = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true, session }
        );
        if (!product) {
          const exists = await Product.exists({ _id: item.productId }).session(session);
          const error = new Error(exists ? 'Insufficient inventory to fulfill this paid order.' : 'A purchased product no longer exists.');
          error.statusCode = exists ? 409 : 404;
          throw error;
        }
      }

      await InventorySale.create([{ orderId, items: normalizedItems }], { session });
    });
    return res.json({ applied: !alreadyApplied, alreadyApplied });
  } catch (error) {
    if (error.code === 11000) return res.json({ applied: false, alreadyApplied: true });
    console.error(`Inventory sync failed for order ${orderId}: ${error.message}`);
    return res.status(error.statusCode || 500).json({ message: error.statusCode ? error.message : 'Could not update inventory.' });
  } finally {
    await session.endSession();
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

export default app;
