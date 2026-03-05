import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import AuditLog from '@/models/AuditLog';
import { verifyJwt } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    try {
        await dbConnect();
        // Return all active products
        const products = await Product.find({ active: true }).sort({ name: 1 });
        return NextResponse.json({ products });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();

        // Auth Check
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const payload = await verifyJwt(token);
        if (!payload || payload.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { name, price, stock, safetyThreshold } = await req.json();

        if (!name || price == null) {
            return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
        }

        const product = await Product.create({
            name,
            price,
            stock: stock || 0,
            safetyThreshold: safetyThreshold || 10,
            active: true,
        });

        // Create Audit Log
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        await AuditLog.create({
            userId: payload.userId,
            action: 'ajout_produit',
            details: { productId: product._id, name: product.name },
            ip,
        });

        return NextResponse.json({ product }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
