import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import AuditLog from '@/models/AuditLog';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = await verifyJwt(token);
        if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const data = await req.json();
        const { name, price, safetyThreshold } = data;

        const oldProduct = await Product.findById(id);
        if (!oldProduct) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

        const updateData: any = {};
        if (name) updateData.name = name;
        if (price != null) updateData.price = price;
        if (safetyThreshold != null) updateData.safetyThreshold = safetyThreshold;

        const product = await Product.findByIdAndUpdate(id, updateData, { new: true });

        // Audit Log if price changed
        if (price != null && oldProduct.price !== price) {
            const ip = req.headers.get('x-forwarded-for') || 'unknown';
            await AuditLog.create({
                userId: payload.userId,
                action: 'modification_prix',
                details: { productId: id, oldPrice: oldProduct.price, newPrice: price },
                ip,
            });
        }

        return NextResponse.json({ product });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = await verifyJwt(token);
        if (!payload || payload.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        // Soft delete
        const product = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
        if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        await AuditLog.create({
            userId: payload.userId,
            action: 'suppression_produit',
            details: { productId: id, name: product.name },
            ip,
        });

        return NextResponse.json({ message: 'Product soft deleted' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
