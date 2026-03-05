import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt, signJwt } from './lib/auth';

const PUBLIC_FILE = /\.(.*)$/;

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Allow public routes, static files, and api auth routes
    if (
        pathname.startsWith('/_next') ||
        pathname.includes('/api/auth') ||
        pathname.includes('/api/setup') ||
        pathname === '/login' ||
        pathname === '/setup' ||
        PUBLIC_FILE.test(pathname)
    ) {
        return NextResponse.next();
    }

    const token = req.cookies.get('token')?.value;

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const payload = await verifyJwt(token);

    if (!payload) {
        // Token is invalid or expired
        const response = NextResponse.redirect(new URL('/login', req.url));
        response.cookies.delete('token');
        return response;
    }

    // Extend the session (sliding session strategy for 5 min inactivity)
    // Re-sign the token with a new 5m expiration
    const newPayload = { ...payload };
    delete newPayload.exp;
    delete newPayload.iat;
    const newToken = await signJwt(newPayload, '5m');

    const response = NextResponse.next();
    response.cookies.set({
        name: 'token',
        value: newToken,
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60, // 5 minutes
    });

    return response;
}

export const config = {
    matcher: ['/((?!api/auth|api/setup|_next/static|_next/image|favicon.ico|login|setup).*)'],
};
