import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
    userId: mongoose.Types.ObjectId;
    action: 'vente' | 'modification_prix' | 'login' | 'ajout_produit' | 'suppression_produit' | 'modification_stock';
    details?: any;
    ip?: string;
    timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: {
        type: String,
        required: true,
        enum: ['vente', 'modification_prix', 'login', 'ajout_produit', 'suppression_produit', 'modification_stock']
    },
    details: { type: Schema.Types.Mixed },
    ip: { type: String },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
