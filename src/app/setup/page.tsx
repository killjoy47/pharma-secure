"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSetup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const res = await fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();

        if (res.ok) {
            alert('Compte Admin créé ! Vous pouvez maintenant vous connecter.');
            router.push('/login');
        } else {
            setError(data.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
            <div className="card w-full max-w-sm shadow-2xl bg-base-100">
                <form className="card-body" onSubmit={handleSetup}>
                    <h2 className="text-center text-2xl font-bold mb-4">Initialisation Admin</h2>

                    {error && <div className="alert alert-error text-sm">{error}</div>}

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Nom</span>
                        </label>
                        <input
                            type="text"
                            placeholder="ex: Dr. Pharm"
                            className="input input-bordered"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Email</span>
                        </label>
                        <input
                            type="email"
                            placeholder="admin@pharma.com"
                            className="input input-bordered"
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
                            className="input input-bordered"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-control mt-6">
                        <button className="btn btn-primary" type="submit">Créer le compte</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
