import React, { useState, useEffect } from 'react';
import { 
    Plus, Package, DollarSign, TrendingUp, AlertTriangle, 
    Pencil, Trash2, ExternalLink, Image as ImageIcon,
    Loader2, Search, Filter, ChevronRight, X, Check,
    Crown, Tv, Radio, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { 
    Merch, fetchCreatorMerchAdmin, createMerchItem, 
    updateMerchItem, deleteMerchItem,
    fetchSubscription, SubscriptionData, PLAN_LIMITS
} from '../../lib/api';
import { useToast } from '../Toast';

export const MerchTracker: React.FC = () => {
    const { accessToken, backendUser } = useAuth();
    const toast = useToast();
    const [merch, setMerch] = useState<Merch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState<Merch | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<Merch | null>(null);
    
    // Form states
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price_stx: '',
        price_usdcx: '',
        stock: '0',
        is_active: true
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Subscription state
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);

    useEffect(() => {
        if (accessToken) {
            loadMerch();
            loadSubscription();
        }
    }, [accessToken]);

    const loadSubscription = async () => {
        try {
            const data = await fetchSubscription(accessToken!);
            setSubscription(data);
        } catch (err) {
            console.error('Failed to load subscription:', err);
        } finally {
            setSubscriptionLoaded(true);
        }
    };

    const loadMerch = async () => {
        try {
            setLoading(true);
            const data = await fetchCreatorMerchAdmin(accessToken!);
            setMerch(data);
        } catch (err: any) {
            console.error('Failed to load merch:', err);
            setError('Failed to load your merchandise. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;

        try {
            setSubmitting(true);
            const data = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                data.append(key, value.toString());
            });
            if (imageFile) {
                data.append('image', imageFile);
            }

            if (editingItem) {
                await updateMerchItem(editingItem.slug, data, accessToken);
            } else {
                await createMerchItem(data, accessToken);
            }

            setShowAddModal(false);
            setEditingItem(null);
            resetForm();
            loadMerch();
        } catch (err: any) {
            console.error('Failed to save merch:', err);
            toast.error('Failed to save merch. Check console for details.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!showDeleteConfirm || !accessToken) return;
        try {
            await deleteMerchItem(showDeleteConfirm.slug, accessToken);
            setShowDeleteConfirm(null);
            loadMerch();
        } catch (err) {
            console.error('Failed to delete:', err);
            toast.error('Failed to delete item.');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            price_stx: '',
            price_usdcx: '',
            stock: '0',
            is_active: true
        });
        setImageFile(null);
    };

    const openEditModal = (item: Merch) => {
        setEditingItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            price_stx: item.price_stx,
            price_usdcx: item.price_usdcx,
            stock: item.stock.toString(),
            is_active: item.is_active
        });
        setShowAddModal(true);
    };

    if (loading && merch.length === 0 && !subscriptionLoaded) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
        );
    }

    // Check if user has access to MerchHub (Starter, Pro, or Enterprise)
    const hasMerchAccess = subscription && subscription.is_active && subscription.plan !== 'free';

    if (subscriptionLoaded && !hasMerchAccess) {
        return (
            <div className="bg-background py-12">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="text-center mb-12">
                        <Crown className="w-16 h-16 text-gold mx-auto mb-4" />
                        <h1 className="text-3xl font-black text-ink mb-3">Upgrade to Access MerchHub</h1>
                        <p className="text-inkLight max-w-lg mx-auto">
                            The MerchHub creator tools are available on Starter, Pro, and Enterprise plans.
                            Upgrade your subscription to start selling merchandise.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        {Object.entries(PLAN_LIMITS).map(([key, plan]) => (
                            <div
                                key={key}
                                className={`p-5 rounded-2xl border transition-colors ${key === 'free'
                                    ? 'bg-surface border-borderSubtle opacity-60'
                                    : key === 'pro'
                                        ? 'bg-gold/10 border-gold/30 ring-2 ring-gold/20'
                                        : 'bg-surface border-borderSubtle hover:border-gold/30'
                                    }`}
                            >
                                <h3 className={`text-lg font-black mb-3 ${key === 'pro' ? 'text-gold' : key === 'free' ? 'text-inkLight' : 'text-ink'
                                    }`}>
                                    {plan.label}
                                    {key === 'pro' && <span className="ml-2 text-xs px-1.5 py-0.5 bg-gold text-background rounded-md">Popular</span>}
                                    {key === 'free' && subscription?.plan === 'free' && (
                                        <span className="ml-2 text-xs px-1.5 py-0.5 bg-borderSubtle text-inkLight rounded-md">Current</span>
                                    )}
                                </h3>
                                <ul className="space-y-2 text-sm text-inkLight">
                                    <li className="flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5" />
                                        Inventory Management
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        Sales Tracking
                                    </li>
                                    {key !== 'free' && (
                                        <li className="flex items-center gap-2 text-green-400">
                                            <Check className="w-3.5 h-3.5" />
                                            MerchHub Enabled
                                        </li>
                                    )}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-inkLight">Contact support or connect your Stacks wallet to upgrade your plan.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-canvas border border-borderSubtle rounded-2xl p-6 shadow-soft">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center text-gold">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-inkLight font-medium">Total Products</p>
                            <p className="text-2xl font-bold text-ink">{merch.length}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-canvas border border-borderSubtle rounded-2xl p-6 shadow-soft">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-inkLight font-medium">Out of Stock</p>
                            <p className="text-2xl font-bold text-ink">
                                {merch.filter(m => m.stock === 0).length}
                            </p>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => { resetForm(); setEditingItem(null); setShowAddModal(true); }}
                    className="bg-gold-gradient text-ink font-bold rounded-2xl p-6 shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-1 transition-all flex flex-col items-center justify-center text-center group"
                >
                    <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span>Add New Product</span>
                </button>
            </div>

            {/* Products Table */}
            <div className="bg-canvas border border-borderSubtle rounded-3xl overflow-hidden shadow-soft">
                <div className="p-6 border-b border-borderSubtle flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="text-xl font-bold text-ink">Inventory Management</h3>
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight" />
                        <input 
                            type="text" 
                            placeholder="Search products..."
                            className="w-full pl-10 pr-4 py-2 bg-surface border border-borderSubtle rounded-xl text-sm focus:outline-none focus:border-gold"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-surface/50 text-inkLight text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Prices</th>
                                <th className="px-6 py-4">Stock</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-borderSubtle">
                            {merch.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-inkLight font-medium">
                                        No products found. Start by adding your first item!
                                    </td>
                                </tr>
                            ) : (
                                merch.map((item) => (
                                    <tr key={item.id} className="hover:bg-surface/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface border border-borderSubtle flex-shrink-0">
                                                    {item.image ? (
                                                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-inkLight">
                                                            <ImageIcon className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-ink">{item.name}</p>
                                                    <p className="text-xs text-inkLight truncate max-w-[200px]">{item.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-ink-500">{item.price_stx} STX</p>
                                                <p className="text-xs text-inkLight">{item.price_usdcx} USDCx</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${item.stock === 0 ? 'text-red-500' : 'text-ink'}`}>
                                                    {item.stock}
                                                </span>
                                                {item.stock <= 5 && item.stock > 0 && (
                                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                                item.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                            }`}>
                                                {item.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => openEditModal(item)}
                                                    className="p-2 text-inkLight hover:text-gold transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setShowDeleteConfirm(item)}
                                                    className="p-2 text-inkLight hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-canvas w-full max-w-2xl rounded-3xl shadow-2xl border border-borderSubtle overflow-hidden"
                        >
                            <div className="p-6 border-b border-borderSubtle flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-ink">
                                    {editingItem ? 'Edit Product' : 'Add New Product'}
                                </h3>
                                <button onClick={() => setShowAddModal(false)} className="text-inkLight hover:text-ink">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4 md:col-span-2">
                                        <label className="text-sm font-bold text-ink">Product Image</label>
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 rounded-2xl bg-surface border-2 border-dashed border-borderSubtle flex items-center justify-center overflow-hidden relative group">
                                                {(imageFile || editingItem?.image) ? (
                                                    <img 
                                                        src={imageFile ? URL.createObjectURL(imageFile) : editingItem?.image!} 
                                                        alt="Preview" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-inkLight" />
                                                )}
                                                <input 
                                                    type="file" 
                                                    accept="image/*"
                                                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex-1 text-sm text-inkLight">
                                                <p className="font-semibold text-ink">Upload your product photo</p>
                                                <p>Recommended: 800x800px square, PNG or JPG max 2MB.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Product Name</label>
                                        <input 
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-gold transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Stock Level</label>
                                        <input 
                                            type="number"
                                            name="stock"
                                            value={formData.stock}
                                            onChange={handleInputChange}
                                            required
                                            min="0"
                                            className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-gold transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Price (STX)</label>
                                        <input 
                                            name="price_stx"
                                            value={formData.price_stx}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="e.g. 50.5"
                                            className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-gold transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Price (USDCx)</label>
                                        <input 
                                            name="price_usdcx"
                                            value={formData.price_usdcx}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="e.g. 10.0"
                                            className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-ink focus:outline-none focus:border-gold transition-all"
                                        />
                                    </div>

                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Description</label>
                                        <textarea 
                                            name="description"
                                            value={formData.description}
                                            onChange={handleInputChange}
                                            required
                                            rows={3}
                                            className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-4 text-ink focus:outline-none focus:border-gold transition-all resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox"
                                            name="is_active"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                            className="w-5 h-5 rounded border-borderSubtle text-gold focus:ring-gold"
                                        />
                                        <label className="text-sm font-bold text-ink">Active Listing</label>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-borderSubtle flex gap-4">
                                    <button 
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-8 py-4 bg-surface text-ink font-bold rounded-2xl hover:bg-borderSubtle transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 px-8 py-4 bg-gold-gradient text-ink font-bold rounded-2xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        {editingItem ? 'Update Product' : 'Create Product'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-canvas w-full max-w-md rounded-3xl shadow-2xl border border-borderSubtle p-8 text-center"
                        >
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                                <Trash2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-ink mb-2">Delete Product?</h3>
                            <p className="text-inkLight mb-8">
                                Are you sure you want to delete <span className="font-bold text-ink">"{showDeleteConfirm.name}"</span>? 
                                This action cannot be undone.
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="flex-1 px-6 py-3 bg-surface text-ink font-bold rounded-xl hover:bg-borderSubtle transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                >
                                    Delete Forever
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
