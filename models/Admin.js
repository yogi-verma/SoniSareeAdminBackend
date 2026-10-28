import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  password: { type: String, required: true, select: false },
  accountType: { type: String, default: 'admin', unique: true },
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;
