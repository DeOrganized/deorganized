import React, { useState, useEffect } from 'react';
import { Zap, TrendingUp, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { fetchCreditsBalance, type CreditsBalance, type CreditEvent } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function sourceLabel(event: CreditEvent): string {
    const src = event.source || event.action || '';
    const map: Record<string, string> = {
        post_created: 'Posted',
        comment_created: 'Commented',
        show_created: 'Created show',
        event_created: 'Created event',
        game_played: 'Played game',
        follow_received: 'Gained follower',
        purchased: 'Purchased credits',
        deduct_game_entry: 'Game entry',
        deduct_purchase: 'Purchase',
    };
    return map[src] || src.replace(/_/g, ' ');
}

// ── Progress bar ───────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ value: number; max: number; met: boolean }> = ({ value, max, met }) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div className="w-full bg-canvas rounded-full h-1.5 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-700 ${met ? 'bg-emerald-500' : 'bg-gold'}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

// ── Credit Event Row ───────────────────────────────────────────────────────────
const EventRow: React.FC<{ event: CreditEvent }> = ({ event }) => {
    const amount = event.amount ?? event.points ?? 0;
    const isDebit = amount < 0;
    return (
        <div className="flex items-center justify-between py-2.5 border-b border-borderSubtle/50 last:border-0">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    isDebit ? 'bg-red-500/10' : 'bg-gold/10'
                }`}>
                    <Zap className={`w-3.5 h-3.5 ${isDebit ? 'text-red-400' : 'text-gold'}`} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{sourceLabel(event)}</p>
                    <p className="text-[10px] text-inkLight/60">{timeAgo(event.created_at)}</p>
                </div>
            </div>
            <span className={`text-sm font-black shrink-0 ml-2 ${isDebit ? 'text-red-400' : 'text-gold'}`}>
                {isDebit ? '' : '+'}{amount}
            </span>
        </div>
    );
};

// ── Main Widget ────────────────────────────────────────────────────────────────
export const CreditsWidget: React.FC = () => {
    const { accessToken, isBackendAuthenticated } = useAuth();
    const [data, setData] = useState<CreditsBalance | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isBackendAuthenticated || !accessToken) {
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchCreditsBalance(accessToken)
            .then(setData)
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [accessToken, isBackendAuthenticated]);

    if (!isBackendAuthenticated) return null;

    // Defensive: normalize all fields so undefined never crashes .toLocaleString()
    const balance = data?.balance ?? 0;
    const earnedTotal = data?.earned_total ?? 0;
    const threshold = data?.engagement_threshold ?? 500;
    const thresholdMet = data?.engagement_threshold_met ?? false;
    const recent = data?.recent ?? [];

    return (
        <div className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-borderSubtle/60">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gold/15 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-gold" />
                    </div>
                    <span className="text-sm font-black text-ink">NOS Credits</span>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-inkLight/50" />}
            </div>

            {error ? (
                <p className="text-xs text-amber-400 px-5 py-4">⚠ {error}</p>
            ) : loading ? (
                <div className="px-5 py-6 space-y-3 animate-pulse">
                    <div className="h-8 w-24 bg-canvas rounded-xl" />
                    <div className="h-2 bg-canvas rounded-full" />
                    <div className="h-3 w-3/4 bg-canvas rounded" />
                </div>
            ) : (
                <>
                    {/* Balance */}
                    <div className="px-5 py-4">
                        <div className="flex items-end gap-2 mb-1">
                            <span className="text-3xl font-black text-ink tabular-nums">
                                {balance.toLocaleString()}
                            </span>
                            <span className="text-xs text-inkLight mb-1">credits</span>
                        </div>

                        {/* Earned total + threshold */}
                        <div className="mt-3 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-inkLight">
                                    <TrendingUp className="w-3 h-3" />
                                    Earned total
                                </span>
                                <span className="font-semibold text-ink">
                                    {earnedTotal.toLocaleString()} / {threshold.toLocaleString()}
                                </span>
                            </div>
                            <ProgressBar value={earnedTotal} max={threshold} met={thresholdMet} />
                            {thresholdMet ? (
                                <p className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Creator tier unlocked
                                </p>
                            ) : (
                                <p className="text-[10px] text-inkLight/60">
                                    {(threshold - earnedTotal).toLocaleString()} more to unlock Creator tier
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Recent events */}
                    {recent.length > 0 && (
                        <div className="px-5 pb-4">
                            <p className="flex items-center gap-1 text-[10px] font-black text-inkLight/70 uppercase tracking-widest mb-2">
                                <Clock className="w-3 h-3" />
                                Recent
                            </p>
                            {recent.slice(0, 5).map((ev) => (
                                <EventRow key={ev.id} event={ev} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default CreditsWidget;
