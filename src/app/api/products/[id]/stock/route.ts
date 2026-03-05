import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import AuditLog from '@/models/AuditLog';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = await verifyJwt(token);
        if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { amount, reason } = await req.json();

        if (amount === undefined || typeof amount !== 'number') {
            return NextResponse.json({ error: 'Valid amount is required' }, { status: 400 });
        }

        // Atomic update using $inc
        const product = await Product.findByIdAndUpdate(
            id,
            { $inc: { stock: amount } },
            { new: true }
        );

        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        await AuditLog.create({
            userId: payload.userId,
            action: 'modification_stock',
            details: { productId: id, amount, reason, newStock: product.stock },
            ip,
        });

        return NextResponse.json({ product });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
