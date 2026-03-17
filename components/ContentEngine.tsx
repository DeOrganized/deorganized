import React, { useState, useEffect, useRef } from 'react';
import {
    Wallet, Zap, FileText, MessageSquare, Image, Clock,
    Loader2, Copy, Check, Radio, ChevronDown, ChevronUp, Plus, RefreshCw, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@stacks/connect';
import { useAuth } from '../lib/AuthContext';
import {
    getDAPStatus, registerDAP, getDAPBalance, getDAPTransactions,
    generateContent, getContentRunStatus, getLatestContent, getContentHistory,
    getContentThumbnailUrl, getStacksWalletBalances,
    DAPStatus, DAPUser, DAPBalance, DAPTransaction, ContentPackage, ContentHistoryItem,
    StacksWalletBalances,
} from '../lib/api';

const PACKAGE_COSTS = {
    'news-package': 100,
    'stacks-package': 50,
};

export const ContentEngine: React.FC = () => {
    const { accessToken, backendUser } = useAuth();

    // DAP state
    const [dapStatus, setDapStatus] = useState<DAPStatus | null>(null);
    const [userBalance, setUserBalance] = useState<DAPBalance | null>(null);
    const [userInfo, setUserInfo] = useState<DAPUser | null>(null);
    const [transactions, setTransactions] = useState<DAPTransaction[]>([]);
    const [isRegistered, setIsRegistered] = useState(false);
    const [walletBalances, setWalletBalances] = useState<StacksWalletBalances | null>(null);

    // Generation state
    const [serviceType, setServiceType] = useState<'news-package' | 'stacks-package'>('news-package');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);

    // Content state
    const [latestContent, setLatestContent] = useState<ContentPackage | null>(null);
    const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
    const [activeContentTab, setActiveContentTab] = useState<'article' | 'thread' | 'thumbnail'>('article');

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [copiedArticle, setCopiedArticle] = useState(false);
    const [copiedThread, setCopiedThread] = useState(false);
    const [copiedThumbnailUrl, setCopiedThumbnailUrl] = useState(false);
    const [copiedTweetIndex, setCopiedTweetIndex] = useState<number | null>(null);

    // Buy credits state
    const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
    const [stxAmount, setStxAmount] = useState('1');
    const [depositPending, setDepositPending] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);

    // UI state
    const [loading, setLoading] = useState(true);
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [copiedMemo, setCopiedMemo] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(true);
    const [txHistoryOpen, setTxHistoryOpen] = useState(false);

    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = () => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    };

    const refreshBalance = async (address: string) => {
        if (!accessToken) return;
        setIsRefreshing(true);
        try {
            const [bal, txData, walletBals] = await Promise.all([
                getDAPBalance(accessToken, address),
                getDAPTransactions(accessToken, address),
                getStacksWalletBalances(address).catch(() => null),
            ]);
            setUserBalance(bal);
            setTransactions(txData.transactions || []);
            if (walletBals) setWalletBalances(walletBals);
        } catch (e) {
            console.error('Failed to refresh balance:', e);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        // Not logged in — show the "connect wallet" message immediately, no spinner
        if (!accessToken || !backendUser) {
            setLoading(false);
            return;
        }

        const init = async () => {
            setLoading(true);
            try {
                const [status, content, history] = await Promise.all([
                    getDAPStatus(accessToken),
                    getLatestContent(accessToken).catch(() => null),
                    getContentHistory(accessToken).catch(() => []),
                ]);
                setDapStatus(status);
                if (content) setLatestContent(content);
                setContentHistory(history);

                const addr = backendUser.stacks_address;
                if (addr) {
                    const registered = await registerDAP(accessToken, addr);
                    setUserInfo(registered);
                    setIsRegistered(true);
                    await refreshBalance(addr);
                }
            } catch (e) {
                console.error('ContentEngine init error:', e);
            } finally {
                setLoading(false);
            }
        };

        init();
        return () => stopPolling();
    }, [accessToken, backendUser]);

    const handleGenerate = async () => {
        if (!accessToken || !userInfo) return;
        setIsGenerating(true);
        setGenerationError(null);

        try {
            await generateContent(accessToken, userInfo.stacks_address, serviceType);
        } catch (e: any) {
            setGenerationError(e.message || 'Failed to start generation');
            setIsGenerating(false);
            return;
        }

        // Poll for completion
        pollIntervalRef.current = setInterval(async () => {
            try {
                const status = await getContentRunStatus(accessToken);
                if (!status.running) {
                    stopPolling();
                    const [content, history] = await Promise.all([
                        getLatestContent(accessToken),
                        getContentHistory(accessToken),
                    ]);
                    setLatestContent(content);
                    setContentHistory(history);
                    setActiveContentTab('article');
                    await refreshBalance(userInfo.stacks_address);
                    setIsGenerating(false);
                }
            } catch {
                stopPolling();
                setIsGenerating(false);
            }
        }, 4000);
    };

    const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    const handleBuyCredits = async () => {
        if (!dapStatus || !userInfo) return;
        const stx = parseFloat(stxAmount);
        if (!stx || stx <= 0) return;
        const microStx = String(Math.round(stx * 1_000_000));
        try {
            await request('stx_transferStx', {
                recipient: dapStatus.deposit_address,
                amount: microStx,
                memo: userInfo.memo_code,
            });
            setDepositPending(true);
            setBuyCreditsOpen(false);
        } catch {
            // user cancelled or wallet rejected — do nothing
        }
    };

    const copyTweet = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedTweetIndex(index);
        setTimeout(() => setCopiedTweetIndex(null), 2000);
    };

    const handleDownloadThumbnail = async (url: string, date: string) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `thumbnail-${date}.jpg`;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch {
            window.open(url, '_blank');
        }
    };

    const balance = parseFloat(userBalance?.balance || '0');
    const cost = PACKAGE_COSTS[serviceType];
    const canGenerate = isRegistered && !isGenerating && balance >= cost;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold text-ink mb-2">Content Engine</h1>
                <p className="text-inkLight font-medium">Generate news articles, X threads, and thumbnails using DAP credits.</p>
            </div>

            {/* DAP Wallet Section */}
            <section className="bg-canvas border-2 border-gold/30 rounded-3xl p-6 md:p-8 shadow-soft">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-gold" />
                    </div>
                    <h2 className="text-xl font-bold text-ink">DAP Wallet</h2>
                    {isRegistered && (
                        <span className="ml-auto text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                            Connected
                        </span>
                    )}
                </div>

                {!isRegistered ? (
                    !backendUser ? (
                        <div className="py-4 space-y-1">
                            <p className="text-sm font-bold text-ink">Connect your wallet to get started</p>
                            <p className="text-xs text-inkLight">Use the Connect Wallet button in the top navigation bar to log in with your Stacks wallet.</p>
                        </div>
                    ) : !backendUser.stacks_address ? (
                        <div className="flex items-center gap-3 py-4">
                            <p className="text-sm text-red-500 font-medium">Your account doesn't have a Stacks address associated. Please contact support.</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gold shrink-0" />
                            <p className="text-sm text-inkLight">Connecting to DAP...</p>
                        </div>
                    )
                ) : (
                    <div className="space-y-4">
                    {/* Stacks Wallet Token Balances */}
                    {walletBalances && (
                        <div className="grid grid-cols-3 gap-3">
                            {([
                                { label: 'STX',   value: walletBalances.stx,   decimals: 2 },
                                { label: 'sBTC',  value: walletBalances.sbtc,  decimals: 8 },
                                { label: 'USDCx', value: walletBalances.usdcx, decimals: 2 },
                            ] as const).map(({ label, value }) => (
                                <div key={label} className="bg-surface rounded-2xl p-4 text-center">
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-lg font-black text-ink">{value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Balance */}
                        <div className="bg-surface rounded-2xl p-5">
                            <p className="text-xs font-bold text-inkLight uppercase tracking-widest mb-2">Credit Balance</p>
                            <div className="text-5xl font-black text-gold mb-1">
                                {balance.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-inkLight">credits available</p>
                                <button
                                    onClick={() => userInfo && refreshBalance(userInfo.stacks_address)}
                                    disabled={isRefreshing}
                                    className="text-inkLight hover:text-gold transition-colors disabled:cursor-not-allowed"
                                    aria-label="Refresh balance"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-gold' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {/* Buy Credits */}
                        {dapStatus && userInfo && (
                            <div className="bg-surface rounded-2xl p-5 space-y-4">
                                <p className="text-xs font-bold text-inkLight uppercase tracking-widest">Buy Credits</p>

                                {depositPending ? (
                                    <div className="flex items-start gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3">
                                        <Clock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-ink">Deposit pending</p>
                                            <p className="text-xs text-inkLight mt-0.5">Credits will appear within ~1 minute once the DAP watcher picks up your transaction.</p>
                                            <button
                                                onClick={() => { setDepositPending(false); userInfo && refreshBalance(userInfo.stacks_address); }}
                                                disabled={isRefreshing}
                                                className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gold hover:underline disabled:opacity-50"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                                                Refresh balance
                                            </button>
                                        </div>
                                    </div>
                                ) : buyCreditsOpen ? (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs text-inkLight mb-1 block">STX amount</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="0.000001"
                                                    step="1"
                                                    value={stxAmount}
                                                    onChange={e => setStxAmount(e.target.value)}
                                                    className="flex-1 bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-gold/60"
                                                />
                                                <span className="text-xs font-bold text-inkLight shrink-0">STX</span>
                                            </div>
                                            <p className="text-xs text-inkLight mt-1.5">
                                                = <span className="font-bold text-gold">
                                                    {Math.round((parseFloat(stxAmount) || 0) * dapStatus.credit_rate).toLocaleString()} credits
                                                </span>
                                                <span className="ml-2 text-inkLight/60">({dapStatus.credit_rate} credits / STX)</span>
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleBuyCredits}
                                                disabled={!parseFloat(stxAmount) || parseFloat(stxAmount) <= 0}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold-gradient text-white text-sm font-bold rounded-xl shadow-md shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                                            >
                                                <Zap className="w-4 h-4" />
                                                Buy with Wallet
                                            </button>
                                            <button
                                                onClick={() => setBuyCreditsOpen(false)}
                                                className="px-4 py-2.5 text-sm font-bold text-inkLight hover:text-ink border border-borderSubtle rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setBuyCreditsOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gold/40 rounded-xl text-sm font-bold text-gold hover:border-gold hover:bg-gold/5 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Buy Credits
                                    </button>
                                )}

                                {/* Advanced: deposit from external wallet */}
                                <div className="border-t border-borderSubtle pt-3">
                                    <button
                                        onClick={() => setAdvancedOpen(v => !v)}
                                        className="flex items-center gap-1.5 text-xs text-inkLight hover:text-ink transition-colors"
                                    >
                                        {advancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        Advanced: deposit from external wallet
                                    </button>
                                    {advancedOpen && (
                                        <div className="mt-3 space-y-2">
                                            <div>
                                                <p className="text-xs text-inkLight mb-1">Deposit Address</p>
                                                <div className="flex items-center gap-2 bg-canvas border border-borderSubtle rounded-xl px-3 py-2">
                                                    <span className="text-xs font-mono text-ink flex-1 truncate">{dapStatus.deposit_address}</span>
                                                    <button onClick={() => copyToClipboard(dapStatus.deposit_address, setCopiedAddress)}>
                                                        {copiedAddress ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-inkLight hover:text-gold transition-colors" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-xs text-inkLight mb-1">Your Memo Code <span className="text-red-500">(required)</span></p>
                                                <div className="flex items-center gap-2 bg-canvas border border-borderSubtle rounded-xl px-3 py-2">
                                                    <span className="text-xs font-mono font-bold text-gold flex-1">{userInfo.memo_code}</span>
                                                    <button onClick={() => copyToClipboard(userInfo.memo_code, setCopiedMemo)}>
                                                        {copiedMemo ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-inkLight hover:text-gold transition-colors" />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    </div>
                )}
            </section>

            {/* Service Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Content Generation Card */}
                <div className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-ink">Content Generation</h3>
                            <p className="text-xs text-inkLight">Article + thread + thumbnail</p>
                        </div>
                    </div>

                    {/* Package selector */}
                    <div className="space-y-2 mb-5">
                        {(['news-package', 'stacks-package'] as const).map((pkg) => (
                            <button
                                key={pkg}
                                onClick={() => setServiceType(pkg)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                                    serviceType === pkg
                                        ? 'border-gold bg-gold/5 text-ink'
                                        : 'border-borderSubtle text-inkLight hover:border-gold/40'
                                }`}
                            >
                                <span>{pkg === 'news-package' ? 'News Package' : 'Stacks Package'}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-black ${serviceType === pkg ? 'bg-gold text-white' : 'bg-surface text-inkLight'}`}>
                                    {PACKAGE_COSTS[pkg]} cr
                                </span>
                            </button>
                        ))}
                    </div>

                    {generationError && (
                        <p className="text-sm text-red-500 font-medium mb-4">{generationError}</p>
                    )}

                    {isRegistered && balance < cost && !isGenerating && (
                        <p className="text-xs text-amber-600 font-medium mb-4">
                            Insufficient credits. You need {cost} credits (have {balance}).
                        </p>
                    )}

                    <button
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gold-gradient text-white font-bold rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Zap className="w-4 h-4" />
                                Generate — {cost} credits
                            </>
                        )}
                    </button>

                    {!isRegistered && !backendUser && (
                        <p className="text-xs text-inkLight text-center mt-3">Log in via the navbar to generate content</p>
                    )}
                </div>

                {/* DCPE Playout Card (stub) */}
                <div className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft opacity-60 relative overflow-hidden">
                    <div className="absolute top-4 right-4">
                        <span className="text-xs font-black bg-surface text-inkLight px-3 py-1 rounded-full border border-borderSubtle uppercase tracking-widest">
                            Coming Soon
                        </span>
                    </div>
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center">
                            <Radio className="w-5 h-5 text-inkLight" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-inkLight">DCPE Playout</h3>
                            <p className="text-xs text-inkLight">Automated broadcast scheduling</p>
                        </div>
                    </div>
                    <p className="text-sm text-inkLight">
                        Credit-gated playout engine scheduling. Auto-schedule and broadcast your generated content directly to your RTMP destinations.
                    </p>
                </div>
            </section>

            {/* Output & History Section */}
            {latestContent && (
                <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
                    <h3 className="text-xl font-bold text-ink mb-5">Latest Output</h3>

                    {/* Content tabs */}
                    <div className="flex gap-2 mb-6">
                        {(['article', 'thread', 'thumbnail'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveContentTab(tab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                    activeContentTab === tab
                                        ? 'bg-gold text-white shadow'
                                        : 'bg-surface text-inkLight hover:text-ink'
                                }`}
                            >
                                {tab === 'article' && <FileText className="w-4 h-4" />}
                                {tab === 'thread' && <MessageSquare className="w-4 h-4" />}
                                {tab === 'thumbnail' && <Image className="w-4 h-4" />}
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeContentTab === 'article' && (
                            <motion.div
                                key="article"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="bg-surface rounded-2xl p-6"
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    {latestContent.narrativeAngle ? (
                                        <p className="text-xs font-bold text-gold uppercase tracking-widest">
                                            Angle: {latestContent.narrativeAngle}
                                        </p>
                                    ) : <span />}
                                    <button
                                        onClick={() => copyToClipboard(latestContent.articleText, setCopiedArticle)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-inkLight hover:text-gold transition-colors shrink-0"
                                    >
                                        {copiedArticle ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedArticle ? 'Copied!' : 'Copy Article'}
                                    </button>
                                </div>
                                <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap font-medium">
                                    {latestContent.articleText}
                                </div>
                            </motion.div>
                        )}

                        {activeContentTab === 'thread' && (
                            <motion.div
                                key="thread"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-3"
                            >
                                <div className="flex justify-end mb-1">
                                    <button
                                        onClick={() => copyToClipboard(latestContent.threadText, setCopiedThread)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-inkLight hover:text-gold transition-colors"
                                    >
                                        {copiedThread ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedThread ? 'Copied!' : 'Copy Thread'}
                                    </button>
                                </div>
                                {latestContent.threadText
                                    .split(/\n(?=\d+\/)/)
                                    .filter(t => t.trim())
                                    .map((tweet, i) => {
                                        const tweetText = tweet.replace(/^\d+\/\n?/, '').trim();
                                        return (
                                            <div key={i} className="bg-surface rounded-2xl p-4 border border-borderSubtle">
                                                <div className="flex items-start gap-3">
                                                    <span className="w-6 h-6 rounded-full bg-gold/10 text-gold text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                                        {i + 1}
                                                    </span>
                                                    <p className="text-sm text-ink leading-relaxed flex-1">{tweetText}</p>
                                                    <button
                                                        onClick={() => copyTweet(tweetText, i)}
                                                        className="text-inkLight hover:text-gold transition-colors shrink-0 mt-0.5"
                                                        aria-label="Copy tweet"
                                                    >
                                                        {copiedTweetIndex === i
                                                            ? <Check className="w-3.5 h-3.5 text-green-500" />
                                                            : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </motion.div>
                        )}

                        {activeContentTab === 'thumbnail' && (
                            <motion.div
                                key="thumbnail"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-4"
                            >
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => copyToClipboard(getContentThumbnailUrl(latestContent.date, 'landscape'), setCopiedThumbnailUrl)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-inkLight hover:text-gold transition-colors"
                                    >
                                        {copiedThumbnailUrl ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedThumbnailUrl ? 'Copied!' : 'Copy URL'}
                                    </button>
                                    <button
                                        onClick={() => handleDownloadThumbnail(getContentThumbnailUrl(latestContent.date, 'landscape'), latestContent.date)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-inkLight hover:text-gold transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Download
                                    </button>
                                </div>
                                <div className="flex justify-center">
                                    <img
                                        src={getContentThumbnailUrl(latestContent.date, 'landscape')}
                                        alt="Generated thumbnail"
                                        className="rounded-2xl max-w-full shadow-md"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            )}

            {/* History Sections */}
            <div className="space-y-4">
                {/* Generation History */}
                <section className="bg-canvas border border-borderSubtle rounded-3xl overflow-hidden shadow-soft">
                    <button
                        onClick={() => setHistoryOpen(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface/50 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-inkLight" />
                            <span className="font-bold text-ink">Generation History</span>
                            {contentHistory.length > 0 && (
                                <span className="text-xs font-bold bg-surface text-inkLight px-2 py-0.5 rounded-full">
                                    {contentHistory.length}
                                </span>
                            )}
                        </div>
                        {historyOpen ? <ChevronUp className="w-4 h-4 text-inkLight" /> : <ChevronDown className="w-4 h-4 text-inkLight" />}
                    </button>

                    <AnimatePresence>
                        {historyOpen && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div className="px-6 pb-4 space-y-2">
                                    {contentHistory.length === 0 ? (
                                        <p className="text-sm text-inkLight py-4 text-center">No generation history yet.</p>
                                    ) : (
                                        contentHistory.map((item) => (
                                            <div
                                                key={item.runId}
                                                className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-borderSubtle hover:border-gold/30 transition-colors cursor-pointer"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                                                    <FileText className="w-4 h-4 text-gold" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-ink truncate">{item.narrativeAngle || item.runType}</p>
                                                    <p className="text-xs text-inkLight">{new Date(item.generatedAt).toLocaleDateString()} · {item.runType}</p>
                                                </div>
                                                {item.hasThumbnail && (
                                                    <Image className="w-4 h-4 text-inkLight shrink-0" />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Transaction History */}
                {isRegistered && (
                    <section className="bg-canvas border border-borderSubtle rounded-3xl overflow-hidden shadow-soft">
                        <button
                            onClick={() => setTxHistoryOpen(v => !v)}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-inkLight" />
                                <span className="font-bold text-ink">Transaction History</span>
                                {transactions.length > 0 && (
                                    <span className="text-xs font-bold bg-surface text-inkLight px-2 py-0.5 rounded-full">
                                        {transactions.length}
                                    </span>
                                )}
                            </div>
                            {txHistoryOpen ? <ChevronUp className="w-4 h-4 text-inkLight" /> : <ChevronDown className="w-4 h-4 text-inkLight" />}
                        </button>

                        <AnimatePresence>
                            {txHistoryOpen && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div className="px-6 pb-4 space-y-2">
                                        {transactions.length === 0 ? (
                                            <p className="text-sm text-inkLight py-4 text-center">No transactions yet.</p>
                                        ) : (
                                            transactions.map((tx) => (
                                                <div key={tx.id} className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-borderSubtle">
                                                    <span className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${
                                                        tx.type === 'mint'
                                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                                            : 'bg-red-50 text-red-700 border border-red-200'
                                                    }`}>
                                                        {tx.type}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-ink truncate">{tx.description || tx.service_name}</p>
                                                        <p className="text-xs text-inkLight">{new Date(tx.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <span className={`text-sm font-black shrink-0 ${tx.type === 'mint' ? 'text-green-600' : 'text-red-500'}`}>
                                                        {tx.type === 'mint' ? '+' : '-'}{tx.amount}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>
                )}
            </div>
        </div>
    );
};
