import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    price: number;
    stock: number;
    safetyThreshold: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const productSchema = new Schema<IProduct>({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true, default: 0 },
    safetyThreshold: { type: Number, required: true, default: 10 },
    active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', productSchema);
