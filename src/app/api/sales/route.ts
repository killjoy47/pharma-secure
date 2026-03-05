import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Sale from '@/models/Sale';
import Product from '@/models/Product';
import AuditLog from '@/models/AuditLog';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = await verifyJwt(token);
        if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const sales = await Sale.find().populate('sellerId', 'name email').sort({ timestamp: -1 }).limit(100);
        return NextResponse.json({ sales });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = await verifyJwt(token);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { items, idempotencyKey } = await req.json();

        if (!items || !items.length || !idempotencyKey) {
            return NextResponse.json({ error: 'Items and idempotencyKey are required' }, { status: 400 });
        }

        // Check Idempotency Key to prevent duplicate sales
        const existingSale = await Sale.findOne({ idempotencyKey });
        if (existingSale) {
            // Sale already processed. Return success without doing anything.
            return NextResponse.json({ message: 'Sale already processed', sale: existingSale }, { status: 200 });
        }

        let total = 0;
        const saleItems = [];
        const bulkProductUpdates = [];

        // Validation loop First to prevent partial updates
        for (const item of items) {
            const dbProduct = await Product.findById(item.productId);
            if (!dbProduct) {
                return NextResponse.json({ error: `Product ${item.name} not found` }, { status: 404 });
            }
            if (dbProduct.stock < item.quantity) {
                return NextResponse.json({ error: `Insufficient stock for ${dbProduct.name}` }, { status: 400 });
            }

            const itemTotal = dbProduct.price * item.quantity;
            total += itemTotal;

            saleItems.push({
                productId: dbProduct._id,
                name: dbProduct.name,
                priceAtTime: dbProduct.price,
                quantity: item.quantity
            });

            // Prepare atomic $inc update for products
            bulkProductUpdates.push({
                updateOne: {
                    filter: { _id: dbProduct._id },
                    update: { $inc: { stock: -item.quantity } }
                }
            });
        }

        // Process Sale using transactions or standard operations
        // Using standard bulkWrite given it's simple
        await Product.bulkWrite(bulkProductUpdates);

        const sale = await Sale.create({
            sellerId: payload.userId,
            items: saleItems,
            total,
            idempotencyKey
        });

        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        await AuditLog.create({
            userId: payload.userId,
            action: 'vente',
            details: { saleId: sale._id, total, itemsCount: items.length },
            ip,
        });

        return NextResponse.json({ message: 'Sale successful', sale }, { status: 201 });
    } catch (error: any) {
        // Handling MongoDB Duplicate Key Error explicitly if it races
        if (error.code === 11000 && error.keyPattern && error.keyPattern.idempotencyKey) {
            return NextResponse.json({ message: 'Sale already processed by another request' }, { status: 200 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
