import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/healthRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN?.split(',').map((origin) => origin.trim()) || 'http://localhost:3000',
  credentials: true
}));

app.use('/api/health', healthRoutes);
app.use('/', adminRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

export default app;
