import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
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

        // Fetch latest 100 audit logs
        const logs = await AuditLog.find().populate('userId', 'name email role').sort({ timestamp: -1 }).limit(100);
        return NextResponse.json({ logs });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
