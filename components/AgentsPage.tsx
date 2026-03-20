import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { Twitter, Send, Loader2, Wallet, Zap, Bot, ExternalLink, RefreshCw } from 'lucide-react';
import { API_BASE_URL, getPublicElioWallet, publicChatWithElio, ElioWallet, ContentPackage } from '../lib/api';

// ─── Error boundary (prevents white-screen crashes from any child error) ─────

class AgentsErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(err: Error) {
        return { error: err?.message || 'An unexpected error occurred.' };
    }
    componentDidCatch(err: Error, info: ErrorInfo) {
        console.error('[AgentsPage] render error:', err, info);
    }
    render() {
        if (this.state.error) {
            return (
                <div className="min-h-screen bg-canvas pt-24 pb-16 flex items-center justify-center">
                    <div className="text-center space-y-3 max-w-md px-6">
                        <p className="text-inkLight text-sm">Something went wrong loading this page.</p>
                        <p className="text-xs font-mono text-red-400">{this.state.error}</p>
                        <button
                            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
                            className="text-sm text-gold hover:underline"
                        >
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const GABBY_STX_ADDRESS = 'SPV0NQCPFMQJ0PPYHAQXXF3VSM64W4WBZ4XYYHNW';
const HIRO_API = 'https://api.hiro.so';

interface GabbyWallet {
    stx: string;
    sbtc: string;
    usdc: string;
}

interface ChatMessage {
    role: 'user' | 'elio';
    text: string;
}

// ─── Gabby wallet via Hiro public API ────────────────────────────────────────

async function fetchGabbyWallet(): Promise<GabbyWallet> {
    const res = await fetch(`${HIRO_API}/extended/v1/address/${GABBY_STX_ADDRESS}/balances`);
    if (!res.ok) throw new Error('Hiro API error');
    const data = await res.json();
    const stxMicro = parseInt(data.stx?.balance ?? '0', 10);
    const stx = (stxMicro / 1_000_000).toFixed(6);

    const tokens: Record<string, { balance: string }> = data.fungible_tokens ?? {};
    const sbtcKey = Object.keys(tokens).find(k => k.toLowerCase().includes('sbtc'));
    const usdcKey = Object.keys(tokens).find(k =>
        k.toLowerCase().includes('aeusdc') || k.toLowerCase().includes('usdc')
    );

    const sbtc = sbtcKey
        ? (parseInt(tokens[sbtcKey].balance, 10) / 1e8).toFixed(8)
        : '0.00000000';
    const usdc = usdcKey
        ? (parseInt(tokens[usdcKey].balance, 10) / 1e6).toFixed(2)
        : '0.00';

    return { stx, sbtc, usdc };
}

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
    <div className="bg-surface border border-borderSubtle rounded-xl p-4 flex flex-col gap-1">
        <span className="text-xs font-mono text-inkLight uppercase tracking-wider">{label}</span>
        <span className="text-lg font-bold text-ink font-mono">{value}</span>
        {sub && <span className="text-xs text-inkLight">{sub}</span>}
    </div>
);

// ─── Section wrapper ─────────────────────────────────────────────────────────

const AgentSection: React.FC<{
    icon: React.ReactNode;
    name: string;
    tagline: string;
    description: string;
    accentClass: string;
    children: React.ReactNode;
}> = ({ icon, name, tagline, description, accentClass, children }) => (
    <section className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className={`px-8 py-6 border-b border-borderSubtle ${accentClass}`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <div>
                    <h2 className="text-2xl font-bold text-ink">{name}</h2>
                    <p className="text-sm text-inkLight font-mono">{tagline}</p>
                </div>
            </div>
            <p className="text-sm text-inkLight leading-relaxed max-w-2xl mt-3">{description}</p>
        </div>
        {/* Content */}
        <div className="p-8 space-y-6">{children}</div>
    </section>
);

// ─── Main component ──────────────────────────────────────────────────────────

const AgentsPageInner: React.FC = () => {
    // Gabby
    const [gabbyWallet, setGabbyWallet] = useState<GabbyWallet | null>(null);
    const [gabbyWalletLoading, setGabbyWalletLoading] = useState(true);
    const [gabbyWalletError, setGabbyWalletError] = useState<string | null>(null);
    const [latestContent, setLatestContent] = useState<ContentPackage | null>(null);
    const [contentLoading, setContentLoading] = useState(true);

    // Elio
    const [elioWallet, setElioWallet] = useState<ElioWallet | null>(null);
    const [elioWalletLoading, setElioWalletLoading] = useState(true);
    const [elioWalletError, setElioWalletError] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // ── Data fetching ──────────────────────────────────────────────────────

    useEffect(() => {
        fetchGabbyWallet()
            .then(setGabbyWallet)
            .catch(e => setGabbyWalletError(e.message))
            .finally(() => setGabbyWalletLoading(false));

        fetch(`${API_BASE_URL}/content/latest/`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setLatestContent)
            .catch(() => {/* no content yet — silently ignore */})
            .finally(() => setContentLoading(false));

        getPublicElioWallet()
            .then(setElioWallet)
            .catch(e => setElioWalletError(e.message))
            .finally(() => setElioWalletLoading(false));
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, chatLoading]);

    // ── Chat ──────────────────────────────────────────────────────────────

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || chatLoading) return;
        setChatError(null);
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text }]);
        setChatLoading(true);
        try {
            const data = await publicChatWithElio(text);
            // Defensive access — response shape may vary if the agent is under load
            const reply: string =
                (data as any)?.response?.reply ||
                (data as any)?.reply ||
                (data as any)?.message ||
                'Elio is unavailable right now. Please try again in a moment.';
            setMessages(prev => [...prev, { role: 'elio', text: reply }]);
        } catch (e: unknown) {
            const msg = e instanceof Error
                ? e.message
                : 'Elio is unavailable right now. Please try again.';
            setChatError(msg);
        } finally {
            setChatLoading(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ── Derived values ──────────────────────────────────────────────────

    const thumbnailDate = latestContent
        ? (latestContent.date || latestContent.generatedAt || '').slice(0, 10)
        : null;

    const firstTweet = latestContent?.threadText
        ? latestContent.threadText.split(/\n\n+/)[0].trim()
        : null;

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-canvas pt-24 pb-16">
            <div className="max-w-4xl mx-auto px-6 space-y-12">

                {/* Page header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gold/10 border border-gold/20 rounded-full text-xs font-mono text-gold uppercase tracking-widest">
                        <Zap className="w-3 h-3" />
                        Autonomous Agents — Live on Mainnet
                    </div>
                    <h1 className="text-4xl font-bold text-ink">Meet the Agents</h1>
                    <p className="text-inkLight max-w-xl mx-auto">
                        DeOrganized runs two autonomous on-chain agents. No human triggers required — they manage wallets, generate content, post to X, tip creators, and hold conversations entirely on their own.
                    </p>
                </div>

                {/* ── GABBY ──────────────────────────────────────────────────────── */}
                <AgentSection
                    icon={<Bot className="w-8 h-8 text-amber-500" />}
                    name="Gabby"
                    tagline="@DeOrganizedBTC · Social Agent · Stacks Mainnet"
                    description="Gabby is DeOrganized's autonomous social agent. She generates crypto news, posts to X, and tips creators in sBTC and USDCx — all on Stacks mainnet, fully autonomous."
                    accentClass="bg-amber-500/5"
                >
                    {/* Wallet */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-amber-500" />
                                Live Wallet Balances
                            </h3>
                            <a
                                href={`https://explorer.hiro.so/address/${GABBY_STX_ADDRESS}?chain=mainnet`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-inkLight hover:text-gold flex items-center gap-1 transition-colors"
                            >
                                {GABBY_STX_ADDRESS.slice(0, 8)}…{GABBY_STX_ADDRESS.slice(-6)}
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                        {gabbyWalletLoading ? (
                            <div className="flex items-center gap-2 text-inkLight text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading balances from Hiro…
                            </div>
                        ) : gabbyWalletError ? (
                            <p className="text-xs text-red-400">{gabbyWalletError}</p>
                        ) : gabbyWallet ? (
                            <div className="grid grid-cols-3 gap-3">
                                <StatCard label="STX" value={parseFloat(gabbyWallet.stx).toFixed(2)} sub="Stacks" />
                                <StatCard label="sBTC" value={parseFloat(gabbyWallet.sbtc) === 0 ? '0' : gabbyWallet.sbtc} sub="Synthetic BTC" />
                                <StatCard label="USDCx" value={parseFloat(gabbyWallet.usdc) === 0 ? '0' : gabbyWallet.usdc} sub="Bridged USDC" />
                            </div>
                        ) : null}
                    </div>

                    {/* Latest Content */}
                    <div>
                        <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-amber-500" />
                            Latest Generated Content
                        </h3>
                        {contentLoading ? (
                            <div className="flex items-center gap-2 text-inkLight text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Fetching latest pack…
                            </div>
                        ) : latestContent ? (
                            <div className="bg-surface border border-borderSubtle rounded-xl overflow-hidden">
                                {thumbnailDate && latestContent.thumbnailLandscape && (
                                    <img
                                        src={`${API_BASE_URL}/content/thumbnail/${thumbnailDate}/landscape/`}
                                        alt="Content thumbnail"
                                        className="w-full h-48 object-cover"
                                        onError={e => { e.currentTarget.style.display = 'none'; }}
                                    />
                                )}
                                <div className="p-5 space-y-2">
                                    {latestContent.date && (
                                        <p className="text-xs font-mono text-inkLight">{latestContent.date}</p>
                                    )}
                                    {latestContent.narrativeAngle && (
                                        <p className="text-sm font-semibold text-ink">{latestContent.narrativeAngle}</p>
                                    )}
                                    {firstTweet && (
                                        <p className="text-sm text-inkLight leading-relaxed line-clamp-4">{firstTweet}</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-inkLight">No content generated yet.</p>
                        )}
                    </div>

                    {/* X link */}
                    <a
                        href="https://x.com/DeOrganizedBTC"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface border border-borderSubtle hover:border-gold/40 rounded-full text-sm font-medium text-ink hover:text-gold transition-all"
                    >
                        <Twitter className="w-4 h-4" />
                        See Gabby's latest posts @DeOrganizedBTC
                        <ExternalLink className="w-3.5 h-3.5 text-inkLight" />
                    </a>
                </AgentSection>

                {/* ── ELIO ──────────────────────────────────────────────────────── */}
                <AgentSection
                    icon={<Bot className="w-8 h-8 text-gold" />}
                    name="Long Elio"
                    tagline="AIBTC Network Agent · Bitcoin + Stacks Mainnet"
                    description="Long Elio is DeOrganized's infrastructure agent on the AIBTC network. He manages network relationships, builds knowledge from every conversation, and operates with his own Bitcoin and Stacks wallets."
                    accentClass="bg-gold/5"
                >
                    {/* Wallet */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-4 h-4 text-gold" />
                            <h3 className="text-sm font-semibold text-ink">Live Wallet Balances</h3>
                        </div>
                        {elioWalletLoading ? (
                            <div className="flex items-center gap-2 text-inkLight text-sm">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading wallet…
                            </div>
                        ) : elioWalletError ? (
                            <p className="text-xs text-red-400">{elioWalletError}</p>
                        ) : elioWallet ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard
                                        label="BTC"
                                        value={elioWallet.balances.btc.btc}
                                        sub={elioWallet.addresses.btc
                                            ? `${elioWallet.addresses.btc.slice(0, 8)}…${elioWallet.addresses.btc.slice(-6)}`
                                            : undefined}
                                    />
                                    <StatCard
                                        label="STX"
                                        value={elioWallet.balances.stx.stx}
                                        sub={elioWallet.addresses.stx
                                            ? `${elioWallet.addresses.stx.slice(0, 8)}…${elioWallet.addresses.stx.slice(-6)}`
                                            : undefined}
                                    />
                                </div>
                                <div className="flex gap-3 flex-wrap">
                                    {elioWallet.addresses.btc && (
                                        <a
                                            href={`https://mempool.space/address/${elioWallet.addresses.btc}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-inkLight hover:text-gold flex items-center gap-1 transition-colors"
                                        >
                                            BTC on mempool.space <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {elioWallet.addresses.stx && (
                                        <a
                                            href={`https://explorer.hiro.so/address/${elioWallet.addresses.stx}?chain=mainnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-inkLight hover:text-gold flex items-center gap-1 transition-colors"
                                        >
                                            STX on Hiro Explorer <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Chat */}
                    <div>
                        <h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-gold" />
                            Chat with Elio
                            <span className="text-xs font-normal text-inkLight">(5 messages/min)</span>
                        </h3>

                        {/* Message list */}
                        <div className="bg-surface border border-borderSubtle rounded-xl p-4 h-72 overflow-y-auto flex flex-col gap-3 mb-3">
                            {messages.length === 0 && (
                                <div className="flex-1 flex items-center justify-center text-center text-sm text-inkLight">
                                    <div>
                                        <Bot className="w-8 h-8 text-gold/40 mx-auto mb-2" />
                                        Say hello to Elio. Ask him about DeOrganized, Bitcoin, or the AIBTC network.
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'bg-gold text-white rounded-br-sm'
                                                : 'bg-canvas border border-borderSubtle text-ink rounded-bl-sm'
                                        }`}
                                    >
                                        {msg.role === 'elio' && (
                                            <span className="text-xs font-mono text-inkLight block mb-1">Elio</span>
                                        )}
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-canvas border border-borderSubtle rounded-2xl rounded-bl-sm px-4 py-2.5">
                                        <span className="text-xs font-mono text-inkLight block mb-1">Elio</span>
                                        <Loader2 className="w-4 h-4 animate-spin text-gold" />
                                    </div>
                                </div>
                            )}
                            {chatError && (
                                <p className="text-xs text-red-400 text-center px-4">{chatError}</p>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="flex gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={chatLoading}
                                placeholder="Message Elio… (Enter to send, Shift+Enter for new line)"
                                rows={2}
                                className="flex-1 bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-ink placeholder-inkLight resize-none focus:outline-none focus:border-gold/50 disabled:opacity-50"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={chatLoading || !input.trim()}
                                className="px-4 bg-gold hover:bg-gold/90 text-white rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium text-sm"
                            >
                                {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </AgentSection>

            </div>
        </div>
    );
};

export const AgentsPage: React.FC = () => (
    <AgentsErrorBoundary>
        <AgentsPageInner />
    </AgentsErrorBoundary>
);
