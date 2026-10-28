import mongoose from 'mongoose';

export const getHealth = (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;

  res.status(databaseConnected ? 200 : 503).json({
    status: databaseConnected ? 'ok' : 'database unavailable',
    database: databaseConnected ? 'connected' : 'disconnected'
  });
};
