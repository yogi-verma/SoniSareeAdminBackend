import mongoose from 'mongoose';

const connectDB = async () => {
  const { MONGODB_URI } = process.env;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Add it to adminBackend/.env.');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected.');
};

export default connectDB;
