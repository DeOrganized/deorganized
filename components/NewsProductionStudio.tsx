import React, { useState, useEffect, useRef } from 'react';
import { Newspaper, Zap, FileText, MessageSquare, Image, Loader2, Copy, Check, Clock, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import {
    triggerNewsGeneration, getContentRunStatus, getLatestContent, getContentHistory,
    getContentThumbnailUrl,
    ContentPackage, ContentHistoryItem,
} from '../lib/api';

export const NewsProductionStudio: React.FC = () => {
    const { accessToken } = useAuth();

    const [runType, setRunType] = useState<'news' | 'stacks'>('news');
    const [operatorPrompt, setOperatorPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [latestContent, setLatestContent] = useState<ContentPackage | null>(null);
    const [contentHistory, setContentHistory] = useState<ContentHistoryItem[]>([]);
    const [activeContentTab, setActiveContentTab] = useState<'article' | 'thread' | 'thumbnail'>('article');
    const [loading, setLoading] = useState(true);
    const [historyOpen, setHistoryOpen] = useState(true);
    const [copiedArticle, setCopiedArticle] = useState(false);
    const [copiedThread, setCopiedThread] = useState(false);
    const [copiedThumbnailUrl, setCopiedThumbnailUrl] = useState(false);
    const [copiedTweetIndex, setCopiedTweetIndex] = useState<number | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!accessToken) {
            setLoading(false);
            return;
        }

        const init = async () => {
            setLoading(true);
            await Promise.allSettled([
                getLatestContent(accessToken).then(setLatestContent).catch(() => {}),
                getContentHistory(accessToken).then(setContentHistory).catch(() => {}),
            ]);
            setLoading(false);
        };

        init();

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [accessToken]);

    const handleGenerate = async () => {
        if (!accessToken || isGenerating) return;
        setIsGenerating(true);
        setGenerationError(null);
        try {
            await triggerNewsGeneration(accessToken, runType, operatorPrompt || undefined);
        } catch (e: any) {
            setGenerationError(e.message);
            setIsGenerating(false);
            return;
        }

        // Poll every 4 seconds
        pollIntervalRef.current = setInterval(async () => {
            try {
                const status = await getContentRunStatus(accessToken);
                if (!status.running) {
                    clearInterval(pollIntervalRef.current!);
                    pollIntervalRef.current = null;
                    const [content, history] = await Promise.all([
                        getLatestContent(accessToken),
                        getContentHistory(accessToken),
                    ]);
                    setLatestContent(content);
                    setContentHistory(history);
                    setActiveContentTab('article');
                    setIsGenerating(false);
                }
            } catch {
                clearInterval(pollIntervalRef.current!);
                pollIntervalRef.current = null;
                setIsGenerating(false);
            }
        }, 4000);
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
                <h2 className="text-4xl font-bold text-ink">News Production Studio</h2>
                <p className="text-inkLight mt-1 font-medium">Trigger and review content generation. No DAP credits required.</p>
            </div>

            {/* Controls Card */}
            <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                        <Newspaper className="w-5 h-5 text-gold" />
                    </div>
                    <h3 className="text-lg font-bold text-ink">Generate Content</h3>
                </div>

                {/* Package type selector */}
                <div className="flex gap-3 mb-5">
                    {(['news', 'stacks'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setRunType(type)}
                            className={`flex-1 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                                runType === type
                                    ? 'border-gold bg-gold/5 text-ink'
                                    : 'border-borderSubtle text-inkLight hover:border-gold/40'
                            }`}
                        >
                            {type === 'news' ? 'News Package' : 'Stacks Package'}
                        </button>
                    ))}
                </div>

                {/* Operator prompt */}
                <div className="mb-5">
                    <label className="text-xs font-bold text-inkLight uppercase tracking-widest mb-2 block">
                        Operator Prompt (optional)
                    </label>
                    <textarea
                        rows={3}
                        value={operatorPrompt}
                        onChange={e => setOperatorPrompt(e.target.value)}
                        placeholder="Optional editorial direction — e.g. 'Focus on DeFi developments and sBTC adoption'"
                        className="w-full bg-surface border border-borderSubtle rounded-2xl px-4 py-3 text-sm font-medium text-ink placeholder:text-inkLight focus:outline-none focus:border-gold/60 transition-colors resize-none"
                        disabled={isGenerating}
                    />
                </div>

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !accessToken}
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
                            Generate {runType === 'news' ? 'News Package' : 'Stacks Package'}
                        </>
                    )}
                </button>

                {/* Error message */}
                {generationError && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <p className="text-sm text-red-600 font-medium">{generationError}</p>
                    </div>
                )}
            </section>

            {/* Content Review */}
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
                                            className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-borderSubtle hover:border-gold/30 transition-colors"
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
        </div>
    );
};
