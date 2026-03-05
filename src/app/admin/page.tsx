"use client";

import { useState, useEffect } from 'react';
import { Package, ShieldAlert, FileText, BarChart3, LogOut, Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import AutoLock from '@/components/AutoLock';
import { format } from 'date-fns';

export default function AdminDashboard() {
    useEffect(() => {
        const checkRole = async () => {
            try {
                const res = await fetch('/api/auth/me');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user.role !== 'admin') {
                        window.location.href = '/vendeur';
                    }
                } else {
                    window.location.href = '/login';
                }
            } catch (e) {
                window.location.href = '/login';
            }
        };
        checkRole();
    }, []);

    const [activeTab, setActiveTab] = useState('products');
    const [products, setProducts] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states for Product
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [formData, setFormData] = useState({ name: '', price: 0, stock: 0, safetyThreshold: 10 });

    // Modal state for Adjust Stock
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [stockProduct, setStockProduct] = useState<any>(null);
    const [stockAmount, setStockAmount] = useState(0);
    const [stockReason, setStockReason] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resProducts, resSales, resLogs] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/sales'),
                fetch('/api/audit'),
            ]);

            const [dataProducts, dataSales, dataLogs] = await Promise.all([
                resProducts.json(),
                resSales.json(),
                resLogs.json(),
            ]);

            setProducts(dataProducts.products || []);
            setSales(dataSales.sales || []);
            setLogs(dataLogs.logs || []);
        } catch (error) {
            console.error("Failed to load dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openProductModal = (product: any = null) => {
        setEditingProduct(product);
        if (product) {
            setFormData({
                name: product.name,
                price: product.price,
                stock: product.stock,
                safetyThreshold: product.safetyThreshold
            });
        } else {
            setFormData({ name: '', price: 0, stock: 0, safetyThreshold: 10 });
        }
        setIsModalOpen(true);
    };

    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
        const method = editingProduct ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            setIsModalOpen(false);
            fetchData();
        } else {
            alert("Erreur lors de la sauvegarde du produit.");
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Voulez-vous vraiment supprimer ce produit ? (Soft delete)")) return;

        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) {
            fetchData();
        }
    };

    const openStockModal = (product: any) => {
        setStockProduct(product);
        setStockAmount(0);
        setStockReason("");
        setIsStockModalOpen(true);
    }

    const handleSaveStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stockProduct) return;

        const res = await fetch(`/api/products/${stockProduct._id}/stock`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: stockAmount, reason: stockReason })
        });

        if (res.ok) {
            setIsStockModalOpen(false);
            fetchData();
        } else {
            alert("Erreur lors de l'ajustement.");
        }
    }

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    };

    const lowStockCount = products.filter(p => p.stock <= p.safetyThreshold).length;
    const todaySalesTotal = sales.filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString()).reduce((a, b) => a + b.total, 0);

    return (
        <div className="flex h-screen bg-base-200">
            <AutoLock />

            {/* Sidebar */}
            <div className="w-64 bg-base-100 shadow-xl flex flex-col hidden md:flex z-10">
                <div className="p-4 border-b border-base-200 flex items-center justify-center">
                    <h1 className="text-2xl font-black text-primary flex items-center gap-2">Pharma<span className="text-secondary">Secure</span></h1>
                </div>
                <div className="flex-1 p-4 space-y-2">
                    <button className={`btn w-full justify-start ${activeTab === 'dashboard' ? 'btn-active btn-neutral' : 'btn-ghost'}`} onClick={() => setActiveTab('dashboard')}>
                        <BarChart3 className="mr-2" size={20} /> Vue d'ensemble
                    </button>
                    <button className={`btn w-full justify-start ${activeTab === 'products' ? 'btn-active btn-neutral' : 'btn-ghost'}`} onClick={() => setActiveTab('products')}>
                        <Package className="mr-2" size={20} /> Inventaire
                        {lowStockCount > 0 && <div className="badge badge-error badge-sm ml-auto">{lowStockCount}</div>}
                    </button>
                    <button className={`btn w-full justify-start ${activeTab === 'sales' ? 'btn-active btn-neutral' : 'btn-ghost'}`} onClick={() => setActiveTab('sales')}>
                        <FileText className="mr-2" size={20} /> Ventes
                    </button>
                    <button className={`btn w-full justify-start ${activeTab === 'audit' ? 'btn-active btn-neutral' : 'btn-ghost'}`} onClick={() => setActiveTab('audit')}>
                        <ShieldAlert className="mr-2" size={20} /> Logs de sécurité
                    </button>
                </div>
                <div className="p-4 border-t border-base-200">
                    <button onClick={logout} className="btn w-full btn-outline btn-error">
                        <LogOut className="mr-2" size={20} /> Déconnexion
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden navbar bg-base-100 shadow-md">
                    <div className="flex-1 text-primary font-bold">PharmaSecure Admin</div>
                    <button onClick={logout} className="btn btn-square btn-ghost">
                        <LogOut size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h2 className="text-3xl font-extrabold capitalize">{activeTab}</h2>
                            <p className="text-base-content/60">Gestion et surveillance de la pharmacie</p>
                        </div>
                        <button className="btn btn-sm btn-outline md:hidden" onClick={() => setActiveTab(activeTab === 'products' ? 'sales' : 'products')}>Changer d'onglet</button>
                    </div>

                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <span className="loading loading-ring loading-lg text-primary"></span>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'dashboard' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <div className="stat bg-base-100 shadow rounded-xl border border-base-200">
                                        <div className="stat-title text-base-content/70">Ventes aujourd'hui (Ar)</div>
                                        <div className="stat-value text-primary">{todaySalesTotal.toLocaleString()}</div>
                                    </div>
                                    <div className="stat bg-base-100 shadow rounded-xl border border-base-error">
                                        <div className="stat-title text-error/80">Alertes Stock</div>
                                        <div className="stat-value text-error flex items-center gap-2"><ShieldAlert /> {lowStockCount}</div>
                                        <div className="stat-desc mt-1">Produits sous le seuil</div>
                                    </div>
                                    <div className="stat bg-base-100 shadow rounded-xl border border-base-200">
                                        <div className="stat-title">Total Produits Actifs</div>
                                        <div className="stat-value">{products.length}</div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'products' && (
                                <div className="bg-base-100 shadow rounded-xl">
                                    <div className="p-4 border-b border-base-200 flex justify-between items-center">
                                        <h3 className="font-bold text-lg">Inventaire</h3>
                                        <button onClick={() => openProductModal()} className="btn btn-primary btn-sm"><Plus size={16} /> Ajouter Produit</button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="table table-zebra w-full">
                                            <thead>
                                                <tr>
                                                    <th>Nom</th>
                                                    <th>Prix</th>
                                                    <th>Stock</th>
                                                    <th>Seuil Alerte</th>
                                                    <th className="text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {products.map(p => (
                                                    <tr key={p._id} className={p.stock <= p.safetyThreshold ? 'bg-error/10 text-error-content' : ''}>
                                                        <td className="font-semibold">{p.name}</td>
                                                        <td>{p.price} Ar</td>
                                                        <td>
                                                            <div className={`badge ${p.stock <= p.safetyThreshold ? 'badge-error' : 'badge-success'} badge-outline cursor-pointer`} onClick={() => openStockModal(p)} title="Ajuster le stock">
                                                                {p.stock}
                                                            </div>
                                                        </td>
                                                        <td>{p.safetyThreshold}</td>
                                                        <td className="text-right flex justify-end gap-2">
                                                            <button onClick={() => openProductModal(p)} className="btn btn-xs btn-square btn-ghost"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDeleteProduct(p._id)} className="btn btn-xs btn-square btn-error btn-outline"><Trash2 size={14} /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'sales' && (
                                <div className="bg-base-100 shadow rounded-xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="table w-full">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Vendeur</th>
                                                    <th>Montant Total</th>
                                                    <th>Détails</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sales.map(s => (
                                                    <tr key={s._id}>
                                                        <td>{format(new Date(s.timestamp), 'dd/MM/yyyy HH:mm:ss')}</td>
                                                        <td>{s.sellerId.name}</td>
                                                        <td className="font-bold text-primary">{s.total} Ar</td>
                                                        <td className="text-xs text-base-content/60">
                                                            <ul className="list-disc pl-4">
                                                                {s.items.map((item: any, i: number) => (
                                                                    <li key={i}>{item.name} (x{item.quantity}) - {item.priceAtTime} Ar/u</li>
                                                                ))}
                                                            </ul>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'audit' && (
                                <div className="bg-base-100 shadow rounded-xl p-4">
                                    <div className="space-y-4">
                                        {logs.map(log => (
                                            <div key={log._id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-base-300 rounded-lg">
                                                <div className="w-40 text-sm opacity-60">
                                                    {format(new Date(log.timestamp), 'dd/MM HH:mm:ss')}
                                                </div>
                                                <div className="w-48 font-semibold flex items-center gap-2">
                                                    <div className="avatar placeholder">
                                                        <div className="bg-neutral text-neutral-content rounded-full w-8">
                                                            <span className="text-xs">{log.userId.name.charAt(0)}</span>
                                                        </div>
                                                    </div>
                                                    {log.userId.name}
                                                </div>
                                                <div className="flex-1">
                                                    <span className="badge badge-outline">{log.action}</span>
                                                    <p className="text-sm mt-1 text-base-content/80 font-mono text-xs">
                                                        {JSON.stringify(log.details)}
                                                    </p>
                                                </div>
                                                <div className="text-xs text-base-content/40 text-right font-mono">
                                                    {log.ip}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Product Modal */}
            {isModalOpen && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg mb-4">{editingProduct ? 'Modifier Produit' : 'Nouveau Produit'}</h3>
                        <form onSubmit={handleSaveProduct} className="space-y-4">
                            <input type="text" placeholder="Nom du produit" className="input input-bordered w-full" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label text-xs">Prix (Ar)</label>
                                    <input type="number" className="input input-bordered w-full" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} required />
                                </div>
                                {!editingProduct && (
                                    <div>
                                        <label className="label text-xs">Stock Initial</label>
                                        <input type="number" className="input input-bordered w-full" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} required />
                                    </div>
                                )}
                                <div>
                                    <label className="label text-xs">Alerte Stock Bas</label>
                                    <input type="number" className="input input-bordered w-full" value={formData.safetyThreshold} onChange={e => setFormData({ ...formData, safetyThreshold: Number(e.target.value) })} required />
                                </div>
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn" onClick={() => setIsModalOpen(false)}>Annuler</button>
                                <button type="submit" className="btn btn-primary">Enregistrer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjust Stock Modal */}
            {isStockModalOpen && stockProduct && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg text-warning mb-4 flex items-center gap-2"><ShieldAlert /> Ajuster Stock Spécial : {stockProduct.name}</h3>
                        <p className="text-sm opacity-70 mb-4">Stock actuel: {stockProduct.stock}</p>

                        <form onSubmit={handleSaveStock} className="space-y-4">
                            <div>
                                <label className="label text-xs font-bold">Quantité d'ajustement (peut être négatif)</label>
                                <input type="number" className="input input-bordered w-full focus:input-warning" value={stockAmount} onChange={e => setStockAmount(Number(e.target.value))} required placeholder="-5 pour perte, 50 pour réapprovisionnement" />
                            </div>
                            <div>
                                <label className="label text-xs">Motif obligatoire (Tracé dans l'audit)</label>
                                <textarea className="textarea textarea-bordered w-full focus:textarea-warning" value={stockReason} onChange={e => setStockReason(e.target.value)} required placeholder="Ex: Inventaire physique, casse, réapprovisionnement exceptionnel..."></textarea>
                            </div>
                            <div className="modal-action">
                                <button type="button" className="btn" onClick={() => setIsStockModalOpen(false)}>Annuler</button>
                                <button type="submit" className="btn btn-warning">Confirmer l'ajustement atomique</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
