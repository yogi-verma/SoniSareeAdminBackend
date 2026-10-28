import mongoose from 'mongoose';

let connectionPromise;

mongoose.connection.on('disconnected', () => {
  connectionPromise = undefined;
});

const connectDB = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Add it to adminBackend/.env.');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    }).then(() => {
      console.log('MongoDB connected.');
      return mongoose.connection;
    }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
};

export default connectDB;
