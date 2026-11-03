import mongoose from 'mongoose';

const inventorySaleSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 }
  }]
}, { timestamps: true });

const InventorySale = mongoose.models.InventorySale || mongoose.model('InventorySale', inventorySaleSchema);
export default InventorySale;
