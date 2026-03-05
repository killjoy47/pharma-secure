import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleItem {
    productId: mongoose.Types.ObjectId;
    name: string;
    priceAtTime: number;
    quantity: number;
}

export interface ISale extends Document {
    sellerId: mongoose.Types.ObjectId;
    items: ISaleItem[];
    total: number;
    idempotencyKey: string;
    timestamp: Date;
}

const saleItemSchema = new Schema<ISaleItem>({
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    priceAtTime: { type: Number, required: true },
    quantity: { type: Number, required: true },
}, { _id: false });

const saleSchema = new Schema<ISale>({
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [saleItemSchema],
    total: { type: Number, required: true },
    idempotencyKey: { type: String, required: true, unique: true },
    timestamp: { type: Date, default: Date.now },
});

saleSchema.index({ idempotencyKey: 1 }, { unique: true });

export default mongoose.models.Sale || mongoose.model<ISale>('Sale', saleSchema);
