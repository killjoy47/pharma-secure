"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutoLock() {
    const router = useRouter();

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const resetTimer = () => {
            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                await fetch('/api/auth/logout', { method: 'POST' });
                router.push('/login');
            }, 5 * 60 * 1000); // 5 minutes
        };

        // Listeners for activity
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('click', resetTimer);
        window.addEventListener('scroll', resetTimer);

        resetTimer();

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('scroll', resetTimer);
        };
    }, [router]);

    return null;
}
