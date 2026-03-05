import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        await dbConnect();

        // Check if any user already exists
        const usersCount = await User.countDocuments();
        if (usersCount > 0) {
            return NextResponse.json({ error: 'Setup already completed. Users exist.' }, { status: 403 });
        }

        const { name, email, password, role } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'admin',
        });

        return NextResponse.json({ message: 'User created successfully', user: newUser }, { status: 201 });
    } catch (error: any) {
        console.error('Setup API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
