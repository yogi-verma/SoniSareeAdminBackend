import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/healthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import connectDB from './config/database.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(',').map((origin) => origin.trim()) || 'http://localhost:3000',
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

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

export default app;
