"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { v4 as uuidv4 } from 'uuid';
import {
    getPendingSales,
    saveToQueue,
    removePendingSale,
    cacheProducts,
    getCachedProducts
} from '@/lib/idb';
import AutoLock from '@/components/AutoLock';
import { Search, ShoppingCart, LogOut, Wifi, WifiOff, Plus, Minus, Trash2 } from 'lucide-react';

interface Product {
    _id: string;
    name: string;
    price: number;
    stock: number;
}

interface CartItem extends Product {
    quantity: number;
}

export default function VendeurPage() {
    const [userRole, setUserRole] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        // Simple client-side role check (token is in cookie)
        const checkRole = async () => {
            try {
                const res = await fetch('/api/auth/me'); // We need this endpoint
                if (res.ok) {
                    const data = await res.json();
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else if (data.user.role !== 'vendeur') {
                        window.location.href = '/login';
                    }
                    setUserRole(data.user.role);
                } else {
                    window.location.href = '/login';
                }
            } catch (e) {
                window.location.href = '/login';
            }
        };
        checkRole();
    }, []);

    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isOnline, setIsOnline] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    // Sync state with online/offline
    useEffect(() => {
        setIsOnline(navigator.onLine);

        const handleOnline = () => {
            setIsOnline(true);
            syncOfflineSales();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Fetch / Cache products
    const fetchProducts = useCallback(async () => {
        try {
            if (isOnline) {
                const res = await fetch('/api/products');
                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products);
                    await cacheProducts(data.products);
                }
            } else {
                const cached = await getCachedProducts();
                setProducts(cached);
            }
        } catch (e) {
            const cached = await getCachedProducts();
            setProducts(cached);
        }
    }, [isOnline]);

    useEffect(() => {
        fetchProducts();
        updatePendingCount();
    }, [fetchProducts]);

    // Sync offline sales
    const syncOfflineSales = async () => {
        if (syncing) return;
        setSyncing(true);
        try {
            const pending = await getPendingSales();
            if (pending.length === 0) {
                setSyncing(false);
                return;
            }

            let syncErrors = 0;
            for (const sale of pending) {
                try {
                    const res = await fetch('/api/sales', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(sale),
                    });

                    if (res.ok || res.status === 400 /* e.g., low stock after reconnect */) {
                        await removePendingSale(sale.idempotencyKey);
                    } else {
                        syncErrors++;
                    }
                } catch (e) {
                    syncErrors++;
                }
            }

            await updatePendingCount();
            await fetchProducts(); // Refresh stock

            if (syncErrors === 0 && pending.length > 0) {
                alert('Toutes les ventes hors-ligne ont été synchronisées.');
            }
        } finally {
            setSyncing(false);
        }
    };

    const updatePendingCount = async () => {
        const pending = await getPendingSales();
        setPendingCount(pending.length);
    };

    // Fuse configuration
    const fuse = useMemo(() => new Fuse(products, {
        keys: ['name'],
        threshold: 0.3, // Fuzzy matching threshold
    }), [products]);

    const searchResults = searchQuery
        ? fuse.search(searchQuery).map(result => result.item)
        : products;

    const addToCart = (product: Product) => {
        if (product.stock <= 0) {
            alert("Rupture de stock");
            return;
        }

        setCart(prev => {
            const existing = prev.find(item => item._id === product._id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    alert(`Stock maximum atteint: ${product.stock}`);
                    return prev;
                }
                return prev.map(item =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item._id === id) {
                const newQty = item.quantity + delta;
                if (newQty > 0 && newQty <= item.stock) {
                    return { ...item, quantity: newQty };
                }
            }
            return item;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(item => item._id !== id));
    };

    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const idempotencyKey = uuidv4();
        const items = cart.map(c => ({
            productId: c._id,
            name: c.name,
            quantity: c.quantity,
            priceAtTime: c.price
        }));

        const salePayload = {
            items,
            idempotencyKey,
            timestamp: new Date().toISOString()
        };

        if (isOnline) {
            try {
                const res = await fetch('/api/sales', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(salePayload)
                });

                if (res.ok) {
                    setCart([]);
                    fetchProducts(); // Refresh stock
                    alert("Vente enregistrée !");
                } else {
                    const err = await res.json();
                    alert(`Erreur: ${err.error || 'Impossible de valider la vente'}`);
                }
            } catch (error) {
                // Network failed during online attempt, fallback to queue
                await saveToQueue(salePayload);
                setCart([]);
                updatePendingCount();
                alert("Réseau instable. Vente sauvegardée hors-ligne !");
            }
        } else {
            // Offline mode
            await saveToQueue(salePayload);
            setCart([]);
            updatePendingCount();

            // Optimitistic lock stock locally
            setProducts(prev => prev.map(p => {
                const cartItem = cart.find(c => c._id === p._id);
                if (cartItem) {
                    return { ...p, stock: p.stock - cartItem.quantity };
                }
                return p;
            }));

            alert("Mode hors-ligne. Vente sauvegardée en attente de réseau !");
        }
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    };

    return (
        <div className="min-h-screen bg-base-200 flex flex-col">
            <AutoLock />

            {/* Navbar */}
            <div className="navbar bg-primary text-primary-content shadow-lg px-4 sticky top-0 z-50">
                <div className="flex-1">
                    <a className="text-xl font-bold tracking-tight">Pharma-Secure</a>
                </div>
                <div className="flex-none gap-4 items-center">
                    {isOnline ? (
                        <div className="badge badge-success gap-1 flex items-center">
                            <Wifi size={14} /> Online
                        </div>
                    ) : (
                        <div className="badge badge-error gap-1 flex items-center">
                            <WifiOff size={14} /> Offline
                        </div>
                    )}

                    {pendingCount > 0 && (
                        <div className="badge badge-warning flex gap-1 cursor-pointer" onClick={syncOfflineSales}>
                            <span>{pendingCount} attente{pendingCount > 1 && 's'}</span>
                            {syncing && <span className="loading loading-spinner loading-xs"></span>}
                        </div>
                    )}

                    <button onClick={logout} className="btn btn-ghost btn-sm btn-circle tooltip tooltip-bottom" data-tip="Déconnexion">
                        <LogOut size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT COLUMN: Search & Products */}
                <div className="lg:col-span-2 flex flex-col gap-4">

                    <div className="bg-base-100 p-4 rounded-xl shadow-sm flex items-center gap-3">
                        <Search className="text-base-content/50" />
                        <input
                            type="text"
                            placeholder="Rechercher un produit (Fuzzy Search)..."
                            className="input w-full bg-transparent focus:outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-4 max-h-[calc(100vh-200px)] lg:max-h-none">
                        {searchResults.map((product) => (
                            <div key={product._id}
                                className={`card bg-base-100 shadow-md transition-transform hover:scale-[1.02] cursor-pointer 
                                  ${product.stock <= 0 ? 'opacity-50 grayscale' : 'hover:shadow-lg focus:ring ring-primary'}`}
                                onClick={() => addToCart(product)}>
                                <div className="card-body p-4 flex flex-col h-full justify-between">
                                    <div>
                                        <h3 className="font-semibold text-lg line-clamp-2 leading-tight">{product.name}</h3>
                                        <p className="text-primary font-bold mt-1">{product.price.toFixed(2)} Ar</p>
                                    </div>
                                    <div className="mt-4 flex justify-between items-center text-sm">
                                        <span className={`badge ${product.stock > 10 ? 'badge-ghost' : product.stock > 0 ? 'badge-warning' : 'badge-error'}`}>
                                            {product.stock} en stock
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {searchResults.length === 0 && (
                            <div className="col-span-full py-10 text-center text-base-content/50">
                                Aucun produit trouvé.
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Cart */}
                <div className="bg-base-100 rounded-xl shadow-lg flex flex-col h-[calc(100vh-100px)] sticky top-[80px]">
                    <div className="p-4 border-b border-base-200 flex justify-between items-center bg-base-200/50 rounded-t-xl">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <ShoppingCart /> Panier
                        </h2>
                        <div className="badge badge-primary">{cart.reduce((a, b) => a + b.quantity, 0)} items</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-base-content/40 space-y-4">
                                <ShoppingCart size={48} strokeWidth={1.5} />
                                <p>Le panier est vide</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item._id} className="flex justify-between items-center bg-base-200 p-3 rounded-lg border border-base-300">
                                    <div className="flex-1 mr-2">
                                        <div className="font-semibold text-sm truncate">{item.name}</div>
                                        <div className="text-xs text-base-content/70">{item.price} Ar / u</div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button className="btn btn-xs btn-circle btn-ghost" onClick={() => updateQuantity(item._id, -1)}>
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-6 text-center font-bold">{item.quantity}</span>
                                        <button className="btn btn-xs btn-circle btn-ghost" onClick={() => updateQuantity(item._id, 1)}>
                                            <Plus size={14} />
                                        </button>
                                        <button className="btn btn-xs btn-square btn-error btn-outline" onClick={() => removeFromCart(item._id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-base-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 bg-base-100 rounded-b-xl">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg text-base-content/70">Total</span>
                            <span className="text-3xl font-extrabold text-primary">{cartTotal.toFixed(2)}</span>
                        </div>
                        <button
                            className={`btn btn-primary w-full text-lg h-14 ${cart.length === 0 ? 'btn-disabled' : ''}`}
                            onClick={handleCheckout}
                        >
                            Encaisser la vente
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
