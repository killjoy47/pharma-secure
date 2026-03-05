"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                if (data.user.role === 'admin') {
                    router.push('/admin');
                } else {
                    router.push('/vendeur');
                }
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-base-200 px-4">
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-primary">Pharma-Secure</h1>
                <p className="mt-2 text-base-content/70">Gestion intelligente et traçabilité</p>
            </div>

            <div className="card w-full max-w-sm shadow-xl bg-base-100">
                <form className="card-body" onSubmit={handleLogin}>
                    <h2 className="text-center text-xl font-bold mb-2">Connexion</h2>

                    {error && <div className="alert alert-error p-2 text-sm">{error}</div>}

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Email</span>
                        </label>
                        <input
                            type="email"
                            placeholder="email@pharma.com"
                            className="input input-bordered w-full"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Mot de passe</span>
                        </label>
                        <input
                            type="password"
                            placeholder="******"
                            className="input input-bordered w-full"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-control mt-6">
                        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
                            {loading ? <span className="loading loading-spinner"></span> : 'Se connecter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
