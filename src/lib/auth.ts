import { SignJWT, jwtVerify } from 'jose';

const getJwtSecretKey = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return new TextEncoder().encode(secret);
};

export async function signJwt(payload: any, expiresIn: string = '5m') {
    const token = await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(getJwtSecretKey());
    return token;
}

export async function verifyJwt(token: string) {
    try {
        const { payload } = await jwtVerify(token, getJwtSecretKey());
        return payload;
    } catch (error) {
        return null; // Invalid token or expired
    }
}
