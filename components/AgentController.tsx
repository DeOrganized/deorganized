import React, { useState, useEffect, useRef } from 'react';
import { Bot, Wallet, Zap, FileText, MessageSquare, Image, Copy, Check, Loader2, RefreshCw, Send, AlertCircle, Terminal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import {
    getElioWallet, chatWithElio,
    getSocialAgentWallet, getSocialAgentStatus, getSocialAgentBalance, getSocialAgentLogs,
    getLatestContent, getContentHistory, getContentThumbnailUrl,
    runSocialNews, runSocialStacks,
    ElioWallet, SocialAgentWallet, SocialAgentStatus,
    ContentPackage, ContentHistoryItem, LogLine,
} from '../lib/api';

type AgentTab = 'gabby' | 'elio';

const TAB_VARIANTS = {
    initial: (dir: number) => ({ opacity: 0, x: dir * 24 }),
    animate: { opacity: 1, x: 0 },
    exit:    (dir: number) => ({ opacity: 0, x: dir * -24 }),
};

export const AgentController: React.FC = () => {
    const { accessToken } = useAuth();

    const [activeAgent, setActiveAgent] = useState<AgentTab>('gabby');
    const prevAgent = useRef<AgentTab>('gabby');
    const tabDirection = activeAgent === 'elio' ? -1 : 1;

    // Elio state
    const [elioWallet, setElioWallet] = useState<ElioWallet | null>(null);
    const [isRefreshingElio, setIsRefreshingElio] = useState(false);
    const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    // Gabby state
    const [socialWallet, setSocialWallet] = useState<SocialAgentWallet | null>(null);
    const [socialStatus, setSocialStatus] = useState<SocialAgentStatus | null>(null);
    const [socialDapBalance, setSocialDapBalance] = useState<string>('0');
    const [isRefreshingSocial, setIsRefreshingSocial] = useState(false);
    const [isRunningNews, setIsRunningNews] = useState(false);
    const [isRunningStacks, setIsRunningStacks] = useState(false);
    const [runStatus, setRunStatus] = useState<string | null>(null);
    const [gabbyLogs, setGabbyLogs] = useState<LogLine[]>([]);

    // Content state (Gabby)
    const [latestContent, setLatestContent] = useState<ContentPackage | null>(null);
    const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
    const [activeContentTab, setActiveContentTab] = useState<'article' | 'thread' | 'thumbnail'>('article');
    const [isRefreshingContent, setIsRefreshingContent] = useState(false);
    const [copiedArticle, setCopiedArticle] = useState(false);
    const [copiedThread, setCopiedThread] = useState(false);
    const [copiedTweetIndex, setCopiedTweetIndex] = useState<number | null>(null);

    // Global state
    const [loading, setLoading] = useState(true);
    const [isRefreshingAll, setIsRefreshingAll] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const logPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Data fetching ─────────────────────────────────────────────────────────

    const fetchElioData = async () => {
        if (!accessToken) return;
        await getElioWallet(accessToken).then(setElioWallet).catch(() => {});
    };

    const fetchGabbyData = async () => {
        if (!accessToken) return;
        await Promise.allSettled([
            getSocialAgentWallet(accessToken).then(setSocialWallet).catch(() => {}),
            getSocialAgentStatus(accessToken).then(setSocialStatus).catch(() => {}),
            getSocialAgentBalance(accessToken).then(b => setSocialDapBalance(b.credit_balance)).catch(() => {}),
        ]);
    };

    const fetchContentData = async () => {
        if (!accessToken) return;
        await Promise.allSettled([
            getLatestContent(accessToken).then(setLatestContent).catch(() => {}),
            getContentHistory(accessToken).then(setContentHistory).catch(() => {}),
        ]);
    };

    const refreshElioWallet = async () => {
        if (!accessToken || isRefreshingElio) return;
        setIsRefreshingElio(true);
        try { await fetchElioData(); } finally { setIsRefreshingElio(false); }
    };

    const refreshSocial = async () => {
        if (!accessToken || isRefreshingSocial) return;
        setIsRefreshingSocial(true);
        try { await fetchGabbyData(); } finally { setIsRefreshingSocial(false); }
    };

    const refreshContent = async () => {
        if (!accessToken || isRefreshingContent) return;
        setIsRefreshingContent(true);
        try { await fetchContentData(); } finally { setIsRefreshingContent(false); }
    };

    const refreshAll = async () => {
        if (!accessToken || isRefreshingAll) return;
        setIsRefreshingAll(true);
        try {
            await Promise.allSettled([
                fetchElioData(),
                fetchGabbyData(),
                fetchContentData(),
            ]);
        } finally { setIsRefreshingAll(false); }
    };

    useEffect(() => {
        if (!accessToken) { setLoading(false); return; }
        const init = async () => {
            setLoading(true);
            await Promise.allSettled([fetchElioData(), fetchGabbyData(), fetchContentData()]);
            setLoading(false);
        };
        init();
        refreshIntervalRef.current = setInterval(() => { fetchElioData(); fetchGabbyData(); }, 60_000);
        return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
    }, [accessToken]);

    // Log polling — Gabby only
    useEffect(() => {
        if (!accessToken) return;
        const fetchLogs = () => {
            getSocialAgentLogs(accessToken).then(data => setGabbyLogs(data.lines)).catch(() => {});
        };
        fetchLogs();
        logPollRef.current = setInterval(fetchLogs, 3000);
        return () => { if (logPollRef.current) clearInterval(logPollRef.current); };
    }, [accessToken]);

    useEffect(() => {
        const el = logContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [gabbyLogs]);

    useEffect(() => {
        const el = chatContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [chatMessages]);

    // ── Actions ───────────────────────────────────────────────────────────────

    const handleRunNews = async () => {
        if (!accessToken || isRunningNews || isRunningStacks) return;
        setIsRunningNews(true); setRunStatus(null);
        try {
            const result = await runSocialNews(accessToken);
            const is409 = (result as any)._status === 409;
            setRunStatus(is409 ? 'A cycle is already in progress.' : result.message ?? 'News cycle started.');
        } catch (e: any) {
            setRunStatus(e.message ?? 'Failed to start news cycle.');
        } finally { setIsRunningNews(false); }
    };

    const handleRunStacks = async () => {
        if (!accessToken || isRunningNews || isRunningStacks) return;
        setIsRunningStacks(true); setRunStatus(null);
        try {
            const result = await runSocialStacks(accessToken);
            const is409 = (result as any)._status === 409;
            setRunStatus(is409 ? 'A cycle is already in progress.' : result.message ?? 'Stacks cycle started.');
        } catch (e: any) {
            setRunStatus(e.message ?? 'Failed to start stacks cycle.');
        } finally { setIsRunningStacks(false); }
    };

    const handleChat = async () => {
        if (!chatInput.trim() || chatLoading || !accessToken) return;
        const userMsg = chatInput.trim();
        setChatInput('');
        setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatLoading(true);
        try {
            const res = await chatWithElio(accessToken, userMsg);
            let replyText: string;
            try {
                replyText = res?.response?.reply ?? (res as any)?.reply ?? 'Received unexpected response format';
            } catch {
                replyText = 'Received unexpected response format';
            }
            setChatMessages(prev => [...prev, { role: 'agent', text: replyText }]);
        } catch (e: any) {
            setChatMessages(prev => [...prev, { role: 'agent', text: `Error: ${e.message}` }]);
        } finally { setChatLoading(false); }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────

    const getLogColor = (message: string): string => {
        if (/error|failed|warning/i.test(message)) return 'text-red-400';
        if (message.includes('[orchestrator]')) return 'text-amber-400';
        if (message.includes('[x-client]')) return 'text-green-400';
        if (message.includes('[content-client]')) return 'text-blue-400';
        if (message.includes('[stx-client]')) return 'text-purple-400';
        if (message.includes('[scheduler]')) return 'text-amber-300';
        return 'text-zinc-400';
    };

    const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    const copyTweet = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedTweetIndex(index);
        setTimeout(() => setCopiedTweetIndex(null), 2000);
    };

    const switchAgent = (tab: AgentTab) => {
        prevAgent.current = activeAgent;
        setActiveAgent(tab);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
        );
    }

    const gabbyRunning = socialStatus?.running ?? false;

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold text-ink">Agent Controller</h1>
                <button
                    onClick={refreshAll}
                    disabled={isRefreshingAll}
                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-borderSubtle text-inkLight hover:text-ink hover:border-gold/40 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshingAll ? 'animate-spin text-gold' : ''}`} />
                    Refresh All
                </button>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-700 text-sm font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="ml-auto text-red-500 text-xs font-bold">Dismiss</button>
                </div>
            )}

            {/* Agent selector tab bar */}
            <div className="bg-canvas border border-borderSubtle rounded-2xl p-1.5 flex gap-1">
                {([
                    { id: 'gabby' as AgentTab, label: 'Gabby', icon: Zap, running: gabbyRunning },
                    { id: 'elio'  as AgentTab, label: 'Long Elio', icon: Bot, running: false },
                ] as const).map(({ id, label, icon: Icon, running }) => (
                    <button
                        key={id}
                        onClick={() => switchAgent(id)}
                        className={`relative flex items-center gap-2.5 flex-1 justify-center px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeAgent === id
                                ? 'bg-ink text-canvas shadow-sm'
                                : 'text-inkLight hover:text-ink hover:bg-surface'
                        }`}
                    >
                        <Icon className={`w-4 h-4 ${activeAgent === id ? 'text-gold' : ''}`} />
                        {label}
                        {/* Status dot */}
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            running ? 'bg-green-500 animate-pulse' : 'bg-zinc-400'
                        }`} />
                    </button>
                ))}
            </div>

            {/* Agent panels */}
            <AnimatePresence mode="wait" custom={tabDirection}>
                {activeAgent === 'gabby' && (
                    <motion.div
                        key="gabby"
                        custom={1}
                        variants={TAB_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="space-y-6"
                    >
                        {/* Gabby wallet + status */}
                        <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-gold" />
                                </div>
                                <h2 className="text-lg font-bold text-ink">Gabby</h2>
                                {socialStatus && (
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                                        socialStatus.running
                                            ? 'bg-green-500/10 text-green-600 border border-green-200'
                                            : 'bg-surface text-inkLight border border-borderSubtle'
                                    }`}>
                                        {socialStatus.running ? 'Running' : 'Idle'}
                                    </span>
                                )}
                                <button
                                    onClick={refreshSocial}
                                    disabled={isRefreshingSocial}
                                    className="ml-auto text-inkLight hover:text-gold transition-colors disabled:opacity-50"
                                    aria-label="Refresh Gabby"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshingSocial ? 'animate-spin text-gold' : ''}`} />
                                </button>
                            </div>

                            {/* Cycle trigger buttons */}
                            <div className="flex items-center gap-3 mb-5">
                                <button
                                    onClick={handleRunNews}
                                    disabled={isRunningNews || isRunningStacks}
                                    className="flex items-center gap-2 px-4 py-2 bg-gold-gradient text-white text-sm font-bold rounded-xl shadow shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                                >
                                    {isRunningNews ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                    Run News
                                </button>
                                <button
                                    onClick={handleRunStacks}
                                    disabled={isRunningNews || isRunningStacks}
                                    className="flex items-center gap-2 px-4 py-2 bg-surface border border-borderSubtle text-ink text-sm font-bold rounded-xl hover:border-gold/40 hover:text-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRunningStacks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                    Run Stacks
                                </button>
                                {runStatus && (
                                    <span className="text-xs text-inkLight font-medium">{runStatus}</span>
                                )}
                            </div>

                            {!socialWallet || !socialStatus ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                                    <span className="text-sm text-inkLight">Loading agent data...</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-surface rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-black text-inkLight uppercase tracking-wider mb-1">STX</p>
                                            <p className="text-sm font-black text-ink">{socialWallet.stx.spendable.toFixed(2)}</p>
                                        </div>
                                        <div className="bg-surface rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-black text-inkLight uppercase tracking-wider mb-1">sBTC</p>
                                            <p className="text-sm font-black text-ink">{socialWallet.sbtc.sats} sats</p>
                                        </div>
                                        <div className="bg-surface rounded-xl p-3 text-center">
                                            <p className="text-[10px] font-black text-inkLight uppercase tracking-wider mb-1">USDCx</p>
                                            <p className="text-sm font-black text-ink">${socialWallet.usdcx.dollars}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-surface rounded-xl p-3">
                                            <p className="text-xs font-black text-inkLight uppercase tracking-wider mb-1">DAP Credits</p>
                                            <p className="text-lg font-black text-gold">{socialDapBalance}</p>
                                        </div>
                                        <div className="bg-surface rounded-xl p-3">
                                            <p className="text-xs font-black text-inkLight uppercase tracking-wider mb-1">Last Run</p>
                                            <p className="text-xs text-ink font-medium">
                                                {socialStatus.last_run_at
                                                    ? new Date(socialStatus.last_run_at).toLocaleString()
                                                    : 'Never'}
                                            </p>
                                            {socialStatus.last_run_status && (
                                                <p className="text-[10px] text-inkLight mt-0.5">{socialStatus.last_run_status}</p>
                                            )}
                                        </div>
                                    </div>
                                    {socialStatus.last_error && (
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Last Error</p>
                                            <p className="text-xs text-red-600">{socialStatus.last_error}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>

                        {/* Gabby Live Logs */}
                        <section className="bg-black border border-zinc-800 rounded-3xl p-6 shadow-soft">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center">
                                    <Terminal className="w-5 h-5 text-zinc-400" />
                                </div>
                                <h2 className="text-lg font-bold text-zinc-200">Live Logs</h2>
                                <span className="text-xs text-zinc-600 font-mono ml-1">{gabbyLogs.length}/200</span>
                                <button
                                    onClick={() => setGabbyLogs([])}
                                    className="ml-auto flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                                    title="Clear log view (client-side only)"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Clear
                                </button>
                            </div>
                            <div
                                ref={logContainerRef}
                                className="h-72 overflow-y-auto font-mono text-xs space-y-0.5 pr-1"
                                style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
                            >
                                {gabbyLogs.length === 0 ? (
                                    <p className="text-zinc-700 py-4 text-center">No logs yet — waiting for activity...</p>
                                ) : (
                                    gabbyLogs.map((line, i) => (
                                        <div key={i} className="flex gap-2 leading-5">
                                            <span className="text-zinc-700 flex-shrink-0 select-none">
                                                {new Date(line.timestamp).toLocaleTimeString()}
                                            </span>
                                            <span className={getLogColor(line.message)}>{line.message}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Latest Content + History */}
                        {latestContent && (
                            <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="text-xl font-bold text-ink">Latest Content</h2>
                                    <button
                                        onClick={refreshContent}
                                        disabled={isRefreshingContent}
                                        className="text-inkLight hover:text-gold transition-colors disabled:opacity-50"
                                        aria-label="Refresh content"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isRefreshingContent ? 'animate-spin text-gold' : ''}`} />
                                    </button>
                                </div>

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
                                            {tab === 'article'   && <FileText className="w-4 h-4" />}
                                            {tab === 'thread'    && <MessageSquare className="w-4 h-4" />}
                                            {tab === 'thumbnail' && <Image className="w-4 h-4" />}
                                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                        </button>
                                    ))}
                                </div>

                                <AnimatePresence mode="wait">
                                    {activeContentTab === 'article' && (
                                        <motion.div
                                            key="article"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className="bg-surface rounded-2xl p-6"
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                {latestContent.narrativeAngle ? (
                                                    <p className="text-xs font-bold text-gold uppercase tracking-widest">Angle: {latestContent.narrativeAngle}</p>
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
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
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
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className="flex justify-center"
                                        >
                                            <img
                                                src={getContentThumbnailUrl(latestContent.date, 'landscape')}
                                                alt="Generated thumbnail"
                                                className="rounded-2xl max-w-full shadow-md"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {contentHistory.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-borderSubtle">
                                        <h3 className="text-sm font-bold text-inkLight uppercase tracking-widest mb-3">History</h3>
                                        <div className="space-y-2">
                                            {contentHistory.map((item) => (
                                                <div
                                                    key={item.runId}
                                                    className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-borderSubtle"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4 text-gold" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-ink truncate">{item.narrativeAngle || item.runType}</p>
                                                        <p className="text-xs text-inkLight">{new Date(item.generatedAt).toLocaleDateString()} · {item.runType}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </motion.div>
                )}

                {activeAgent === 'elio' && (
                    <motion.div
                        key="elio"
                        custom={-1}
                        variants={TAB_VARIANTS}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="space-y-6"
                    >
                        {/* Elio wallet */}
                        <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                    <Bot className="w-5 h-5 text-gold" />
                                </div>
                                <h2 className="text-lg font-bold text-ink">Long Elio</h2>
                                <button
                                    onClick={refreshElioWallet}
                                    disabled={isRefreshingElio}
                                    className="ml-auto text-inkLight hover:text-gold transition-colors disabled:opacity-50"
                                    aria-label="Refresh Elio wallet"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isRefreshingElio ? 'animate-spin text-gold' : ''}`} />
                                </button>
                            </div>

                            {!elioWallet ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                                    <span className="text-sm text-inkLight">Loading wallet...</span>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-surface rounded-2xl p-4 space-y-1">
                                            <p className="text-xs font-black text-inkLight uppercase tracking-widest">BTC Balance</p>
                                            <p className="text-2xl font-black text-ink">{elioWallet.balances.btc.btc} BTC</p>
                                            <p className="text-xs text-inkLight">{elioWallet.balances.btc.sats} sats</p>
                                        </div>
                                        <div className="bg-surface rounded-2xl p-4 space-y-1">
                                            <p className="text-xs font-black text-inkLight uppercase tracking-widest">STX Balance</p>
                                            <p className="text-2xl font-black text-ink">{elioWallet.balances.stx.stx} STX</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2">
                                            <span className="text-xs font-mono text-inkLight flex-1 truncate">
                                                {elioWallet.addresses.btc.slice(0, 8)}...{elioWallet.addresses.btc.slice(-6)}
                                            </span>
                                            <span className="text-[10px] font-black text-inkLight uppercase">BTC</span>
                                            <button
                                                onClick={() => copyToClipboard(elioWallet.addresses.btc, () => {})}
                                                className="text-inkLight hover:text-gold transition-colors"
                                                aria-label="Copy BTC address"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 bg-surface rounded-xl px-3 py-2">
                                            <span className="text-xs font-mono text-inkLight flex-1 truncate">
                                                {elioWallet.addresses.stx.slice(0, 8)}...{elioWallet.addresses.stx.slice(-6)}
                                            </span>
                                            <span className="text-[10px] font-black text-inkLight uppercase">STX</span>
                                            <button
                                                onClick={() => copyToClipboard(elioWallet.addresses.stx, () => {})}
                                                className="text-inkLight hover:text-gold transition-colors"
                                                aria-label="Copy STX address"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Chat with Elio */}
                        <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                    <MessageSquare className="w-5 h-5 text-gold" />
                                </div>
                                <h2 className="text-lg font-bold text-ink">Chat with Elio</h2>
                            </div>

                            <div ref={chatContainerRef} className="h-80 overflow-y-auto bg-surface rounded-2xl p-4 space-y-3 mb-4">
                                {chatMessages.length === 0 && (
                                    <p className="text-sm text-inkLight text-center py-8">
                                        Send a message to start chatting with Long Elio.
                                    </p>
                                )}
                                {chatMessages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        {msg.role === 'agent' && (
                                            <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center shrink-0 mt-0.5">
                                                <Bot className="w-4 h-4 text-gold" />
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm font-medium ${
                                            msg.role === 'user'
                                                ? 'bg-gold/10 text-ink ml-auto'
                                                : 'bg-canvas text-ink border border-borderSubtle'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                                            <Bot className="w-4 h-4 text-gold" />
                                        </div>
                                        <div className="bg-canvas border border-borderSubtle rounded-2xl px-4 py-2.5">
                                            <Loader2 className="w-4 h-4 animate-spin text-gold" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={e => setChatInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleChat(); }}
                                    placeholder="Ask Elio anything..."
                                    className="flex-1 bg-surface border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-medium text-ink placeholder:text-inkLight focus:outline-none focus:border-gold/60 transition-colors"
                                    disabled={chatLoading || !accessToken}
                                />
                                <button
                                    onClick={handleChat}
                                    disabled={chatLoading || !chatInput.trim() || !accessToken}
                                    className="flex items-center gap-2 px-5 py-3 bg-gold-gradient text-white font-bold rounded-2xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
                                >
                                    {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </div>
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
