import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import bcrypt from 'bcryptjs';
import { signJwt } from '@/lib/auth';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create Audit Log
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        await AuditLog.create({
            userId: user._id,
            action: 'login',
            ip,
        });

        const payload = {
            userId: user._id.toString(),
            role: user.role,
            name: user.name,
        };

        const token = await signJwt(payload, '5m');

        const response = NextResponse.json({
            message: 'Login successful',
            user: payload,
        });

        response.cookies.set({
            name: 'token',
            value: token,
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 5 * 60, // 5 minutes
        });

        return response;
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
