import React, { useState, useEffect } from 'react';
import { X, Heart, Loader2, ExternalLink, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchTipPaymentInfo, sendTip, TipPaymentInfo, getImageUrl } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

interface TipModalProps {
    creatorId: number;
    onClose: () => void;
}

const QUICK_AMOUNTS = [1, 5, 10, 25, 50];

const TipModal: React.FC<TipModalProps> = ({ creatorId, onClose }) => {
    const { accessToken, walletAddress, backendUser } = useAuth();
    const [tipInfo, setTipInfo] = useState<TipPaymentInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [tokenType, setTokenType] = useState<'STX' | 'USDCx' | 'sBTC'>('USDCx');
    const [amount, setAmount] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [txId, setTxId] = useState<string | null>(null);

    useEffect(() => {
        const loadInfo = async () => {
            if (!accessToken) return;
            try {
                const info = await fetchTipPaymentInfo(creatorId, accessToken);
                setTipInfo(info);
            } catch (err: any) {
                setError(err.message || 'Failed to load tip info');
            } finally {
                setLoading(false);
            }
        };
        loadInfo();
    }, [creatorId, accessToken]);

    const handleSendTip = async () => {
        if (!accessToken || !amount || parseFloat(amount) <= 0) return;
        setSending(true);
        setError('');

        try {
            const divisor = tokenType === 'sBTC' ? 100_000_000 : 1_000_000;
            const microAmount = Math.round(parseFloat(amount) * divisor);
            const amountStx = tokenType === 'STX' ? microAmount : 0;
            const amountUsdcx = tokenType === 'USDCx' ? microAmount : 0;
            const amountSbtc = tokenType === 'sBTC' ? microAmount : 0;

            const response = await sendTip(creatorId, amountStx, amountUsdcx, accessToken, {
                senderAddress: walletAddress || backendUser?.stacks_address || '',
                tokenType,
            }, amountSbtc);

            // Backend returning {"success": true, "receipt": {...}} or similar
            if (response && response.tx_id) {
                setTxId(response.tx_id);
            } else if (response && response.receipt && response.receipt.tx_id) {
                setTxId(response.receipt.tx_id);
            }

            setSuccess(true);
        } catch (err: any) {
            if (err.name === 'PaymentCancelledError') {
                // User cancelled
            } else {
                setError(err.message || 'Failed to send tip');
            }
        } finally {
            setSending(false);
        }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-surface rounded-3xl p-8 max-w-sm w-full mx-4 text-center border border-gold/30"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="w-16 h-16 rounded-full bg-green-400/20 flex items-center justify-center mx-auto mb-4">
                        <Heart className="w-8 h-8 text-green-400" fill="currentColor" />
                    </div>
                    <h3 className="text-xl font-black text-ink mb-2">Tip Sent! 🎉</h3>
                    <p className="text-inkLight text-sm mb-4">
                        {amount} {tokenType} sent to {tipInfo?.creator_display_name}
                    </p>

                    {txId && (
                        <a
                            href={`https://explorer.hiro.so/txid/${txId}?chain=mainnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 text-gold hover:text-gold/80 transition-colors text-xs font-bold mb-6"
                        >
                            <ExternalLink className="w-3 h-3" />
                            View on Explorer
                        </a>
                    )}

                    <button onClick={onClose} className="w-full px-6 py-3 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/90 transition-all">
                        Done
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-surface rounded-3xl p-6 max-w-md w-full mx-4 border border-borderSubtle md:max-w-md max-md:fixed max-md:inset-0 max-md:rounded-none max-md:border-0"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-black text-ink flex items-center gap-2">
                        <Heart className="w-5 h-5 text-gold" />
                        Send a Tip
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background/50 text-inkLight">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : (
                    <>
                        {/* Creator info */}
                        {tipInfo && (
                            <div className="flex items-center gap-3 mb-5 p-3 rounded-2xl bg-background/50 border border-borderSubtle">
                                {tipInfo.profile_picture ? (
                                    <img src={getImageUrl(tipInfo.profile_picture) || ''} alt="" className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold font-bold">
                                        {tipInfo.creator_display_name[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-ink text-sm">{tipInfo.creator_display_name}</p>
                                    <p className="text-xs text-inkLight">@{tipInfo.creator_username}</p>
                                </div>
                            </div>
                        )}

                        {/* Token selector */}
                        <div className="flex gap-2 mb-4">
                            {(['USDCx', 'STX', 'sBTC'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTokenType(t)}
                                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${tokenType === t
                                            ? 'bg-gold text-background'
                                            : 'bg-background/50 border border-borderSubtle text-inkLight hover:border-gold/30'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Quick amounts */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {QUICK_AMOUNTS.map(a => (
                                <button
                                    key={a}
                                    onClick={() => setAmount(a.toString())}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${amount === a.toString()
                                            ? 'bg-gold text-background'
                                            : 'bg-background/50 border border-borderSubtle text-inkLight hover:border-gold/30'
                                        }`}
                                >
                                    {a} {tokenType}
                                </button>
                            ))}
                        </div>

                        {/* Custom amount */}
                        <div className="relative mb-5">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight" />
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder={`Custom ${tokenType} amount`}
                                className="w-full pl-9 pr-4 py-3 rounded-xl bg-transparent border border-inkLight/30 text-ink text-sm focus:ring-2 focus:ring-gold/30 focus:border-gold/50 outline-none transition-all"
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 mb-3">{error}</p>
                        )}

                        {/* Send button */}
                        <button
                            onClick={handleSendTip}
                            disabled={!amount || parseFloat(amount) <= 0 || sending}
                            className="w-full py-3 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {sending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                            ) : (
                                <><Heart className="w-4 h-4" /> Send {amount || '0'} {tokenType}</>
                            )}
                        </button>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default TipModal;
