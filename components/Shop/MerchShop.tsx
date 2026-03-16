import React, { useState, useEffect } from 'react';
import { 
    ShoppingBag, Search, Filter, ArrowRight, Loader2, 
    Tag as TagIcon, CreditCard, CheckCircle2, ChevronDown,
    Zap, ShoppingCart, X, Package, ShieldCheck, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { Merch, fetchMerchList, createOrder } from '../../lib/api';
import { x402Fetch } from '../../lib/x402Client';
import { useToast } from '../Toast';

interface MerchShopProps {
    creatorId?: number;
    creatorName?: string;
    onNavigate?: (page: string, id?: string | number) => void;
}

export const MerchShop: React.FC<MerchShopProps> = ({ creatorId, creatorName, onNavigate }) => {
    const { isBackendAuthenticated, backendUser, accessToken, connectWallet } = useAuth();
    const toast = useToast();
    const [merch, setMerch] = useState<Merch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Purchase flow states
    const [selectedProduct, setSelectedProduct] = useState<Merch | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [isBuying, setIsBuying] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadMerch();
    }, [creatorId]);

    const loadMerch = async () => {
        try {
            setLoading(true);
            const data = await fetchMerchList(creatorId);
            setMerch(data.filter(item => item.is_active));
        } catch (err) {
            console.error('Failed to load merch:', err);
            setError('Failed to load products. please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!backendUser) {
            connectWallet();
            return;
        }

        if (!selectedProduct || !accessToken) return;

        try {
            setIsBuying(true);
            
            // Real X402 Payment
            const amountSTX = parseFloat(selectedProduct.price_stx) * quantity;
            const amountUSDCx = Math.round(parseFloat(selectedProduct.price_usdcx) * quantity * 1000000); // convert to 6 decimals
            
            const { response, receiptToken } = await x402Fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/orders/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    merch: selectedProduct.id,
                    quantity: quantity,
                    shipping_address: 'Digital / Demo Order'
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || errorData.error || 'Purchase failed');
            }

            const orderData = await response.json();
            
            setPurchaseSuccess(orderData.tx_id || 'verified');
            setTimeout(() => {
                setPurchaseSuccess(null);
                setSelectedProduct(null);
                setQuantity(1);
            }, 5000);
        } catch (err: any) {
            console.error('Purchase failed:', err);
            toast.error(err.message || 'Payment failed. Please try again.');
        } finally {
            setIsBuying(false);
        }
    };

    const filteredMerch = merch.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-gold" />
                <p className="text-inkLight font-medium animate-pulse">Loading {creatorName ? `${creatorName}'s` : ''} Shop...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Shop Header */}
            <div className="relative rounded-[2rem] overflow-hidden bg-ink text-background p-8 md:p-12 shadow-2xl">
                <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
                    <ShoppingBag className="w-full h-full rotate-12 translate-x-1/4 translate-y-1/4" />
                </div>
                
                <div className="relative z-10 max-w-2xl space-y-4">
                    <div className="flex items-center gap-2 text-gold font-black uppercase tracking-[0.2em] text-xs">
                        <Zap className="w-4 h-4 fill-current" />
                        Creator Marketplace
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                        {creatorName ? `${creatorName}'s Merchandise` : 'The DeOrganized Shop'}
                    </h1>
                    <p className="text-inkLight text-lg max-w-lg">
                        Support your favorite creators directly by purchasing unique merchandise and exclusive collectibles.
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                    <input 
                        type="text" 
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-canvas border border-borderSubtle rounded-2xl shadow-soft focus:outline-none focus:border-gold transition-all"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-canvas border border-borderSubtle rounded-2xl font-bold hover:bg-surface transition-all">
                        <Filter className="w-5 h-5" />
                        Filter
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-canvas border border-borderSubtle rounded-2xl font-bold hover:bg-surface transition-all">
                        <TrendingUp className="w-5 h-5" />
                        Sort
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredMerch.length === 0 ? (
                    <div className="col-span-full text-center py-20 bg-surface/30 rounded-3xl border border-dashed border-borderSubtle">
                        <Package className="w-16 h-16 mx-auto mb-4 text-inkLight opacity-20" />
                        <h3 className="text-xl font-bold text-ink mb-2">No items found</h3>
                        <p className="text-inkLight">Try adjusting your search or check back later!</p>
                    </div>
                ) : (
                    filteredMerch.map((item, index) => (
                        <motion.div 
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-canvas rounded-3xl border border-borderSubtle overflow-hidden shadow-soft hover:shadow-xl hover:-translate-y-2 transition-all group flex flex-col"
                        >
                            <div className="aspect-square relative overflow-hidden bg-surface">
                                {item.image ? (
                                    <img 
                                        src={item.image} 
                                        alt={item.name} 
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-20">
                                        <ShoppingBag className="w-20 h-20" />
                                    </div>
                                )}
                                <div className="absolute top-4 right-4 translate-x-12 group-hover:translate-x-0 transition-transform duration-500">
                                    <button className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 text-ink hover:text-gold transition-colors">
                                        <ShoppingCart className="w-5 h-5" />
                                    </button>
                                </div>
                                {item.stock < 10 && item.stock > 0 && (
                                    <div className="absolute bottom-4 left-4 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                                        Only {item.stock} left
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-6 space-y-4 flex-1 flex flex-col">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gold uppercase tracking-[0.1em]">{item.creator_username}</p>
                                    <h3 className="text-lg font-bold text-ink leading-tight">{item.name}</h3>
                                </div>
                                
                                <p className="text-sm text-inkLight line-clamp-2 flex-1">
                                    {item.description}
                                </p>

                                <div className="pt-4 flex items-end justify-between gap-4">
                                    <div>
                                        <p className="text-2xl font-black text-ink">{item.price_stx} STX</p>
                                        <p className="text-xs text-inkLight font-medium">≈ {item.price_usdcx} USDCx</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedProduct(item)}
                                        className="bg-gold-gradient text-ink font-bold px-6 py-3 rounded-2xl shadow-lg shadow-gold/10 hover:shadow-gold/30 hover:scale-105 active:scale-95 transition-all text-sm"
                                    >
                                        Buy Now
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            {/* Checkout Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="bg-canvas w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-borderSubtle overflow-hidden flex flex-col md:flex-row"
                        >
                            {/* Left: Product Info */}
                            <div className="w-full md:w-1/2 bg-surface p-8 md:p-12 space-y-8 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <button 
                                        onClick={() => setSelectedProduct(null)}
                                        className="text-inkLight hover:text-ink transition-colors flex items-center gap-2 font-bold"
                                    >
                                        <X className="w-5 h-5" />
                                        Keep Browsing
                                    </button>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-gold font-black uppercase text-xs">
                                            <TagIcon className="w-4 h-4" />
                                            Product Details
                                        </div>
                                        <h2 className="text-4xl font-bold text-ink">{selectedProduct.name}</h2>
                                        <p className="text-inkLight leading-relaxed">{selectedProduct.description}</p>
                                    </div>
                                </div>
                                
                                <div className="aspect-square rounded-3xl overflow-hidden border border-borderSubtle bg-canvas shadow-soft">
                                    {selectedProduct.image ? (
                                        <img src={selectedProduct.image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-20">
                                            <ShoppingBag className="w-24 h-24" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Checkout Logic */}
                            <div className="w-full md:w-1/2 p-8 md:p-12 space-y-10">
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-bold text-ink flex items-center gap-3">
                                        <CreditCard className="w-7 h-7 text-gold" />
                                        Secure Checkout
                                    </h3>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-surface rounded-2xl border border-borderSubtle">
                                            <span className="font-bold text-ink">Quantity</span>
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                    className="w-8 h-8 rounded-lg bg-canvas border border-borderSubtle flex items-center justify-center hover:bg-gold-50 transition-colors font-bold"
                                                >
                                                    -
                                                </button>
                                                <span className="font-black text-xl w-6 text-center">{quantity}</span>
                                                <button 
                                                    onClick={() => setQuantity(quantity + 1)}
                                                    className="w-8 h-8 rounded-lg bg-canvas border border-borderSubtle flex items-center justify-center hover:bg-gold-50 transition-colors font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-gold/5 rounded-3xl border border-gold/10 space-y-4">
                                            <div className="flex justify-between text-inkLight font-medium">
                                                <span>Subtotal</span>
                                                <span>{(parseFloat(selectedProduct.price_stx) * quantity).toFixed(2)} STX</span>
                                            </div>
                                            <div className="flex justify-between text-inkLight font-medium">
                                                <span>Transaction Fee</span>
                                                <span>0.001 STX</span>
                                            </div>
                                            <div className="pt-4 border-t border-gold/20 flex justify-between items-end">
                                                <div>
                                                    <p className="text-sm font-bold text-gold uppercase tracking-wider">Total Amount</p>
                                                    <p className="text-3xl font-black text-ink">
                                                        {(parseFloat(selectedProduct.price_stx) * quantity + 0.001).toFixed(3)} STX
                                                    </p>
                                                </div>
                                                <p className="text-xs text-inkLight mb-1">
                                                    ≈ {(parseFloat(selectedProduct.price_usdcx) * quantity).toFixed(2)} USDCx
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 text-sm">
                                        <ShieldCheck className="w-5 h-5 flex-shrink-0" />
                                        Payments are secured by the Stacks blockchain and verified by x402.
                                    </div>

                                    {purchaseSuccess ? (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="text-center space-y-4 py-4"
                                        >
                                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                                <CheckCircle2 className="w-10 h-10" />
                                            </div>
                                            <h4 className="text-2xl font-black text-emerald-600">Purchase Successful!</h4>
                                            <p className="text-inkLight text-sm">
                                                Transaction verified: <br/>
                                                <span className="font-mono text-[10px] break-all opacity-60">{purchaseSuccess}</span>
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <button 
                                            onClick={handlePurchase}
                                            disabled={isBuying}
                                            className="w-full bg-ink text-background py-5 rounded-2xl font-black text-lg shadow-xl hover:shadow-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {isBuying ? (
                                                <>
                                                    <Loader2 className="w-6 h-6 animate-spin" />
                                                    Verifying Transaction...
                                                </>
                                            ) : (
                                                <>
                                                    <CreditCard className="w-6 h-6" />
                                                    Pay with Stacks Wallet
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {!isBackendAuthenticated && (
                                        <p className="text-center text-xs text-inkLight">
                                            Authentication required to process payments.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
