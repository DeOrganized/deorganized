import React, { useState, useEffect } from 'react';
import {
    ScrollText, Loader2, CheckCircle2, XCircle,
    ChevronDown, ChevronUp, Vote, Clock, Plus,
} from 'lucide-react';
import {
    fetchProposals, createProposal, castVote,
    type Proposal,
} from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeLeft(endStr: string): string {
    const diff = new Date(endStr).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h left`;
    return `${Math.floor(hrs / 24)}d left`;
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_STYLES: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400',
    passed: 'bg-blue-500/10 text-blue-400',
    rejected: 'bg-red-500/10 text-red-400',
    executed: 'bg-purple-500/10 text-purple-400',
    draft: 'bg-surface text-inkLight',
};

// ── Vote Bar ───────────────────────────────────────────────────────────────────
const VoteBar: React.FC<{ votesFor: number; votesAgainst: number; quorum: number }> = ({
    votesFor, votesAgainst, quorum,
}) => {
    const total = votesFor + votesAgainst;
    const forPct = total > 0 ? (votesFor / total) * 100 : 0;
    return (
        <div className="space-y-1 mt-3">
            <div className="w-full h-1.5 bg-canvas rounded-full overflow-hidden flex">
                <div
                    className="h-full bg-emerald-500 transition-all duration-500 rounded-l-full"
                    style={{ width: `${forPct}%` }}
                />
                <div
                    className="h-full bg-red-500 transition-all duration-500 rounded-r-full"
                    style={{ width: `${100 - forPct}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-inkLight/60">
                <span className="text-emerald-500">✓ {votesFor} for</span>
                <span>{total} / {quorum} quorum</span>
                <span className="text-red-400">✗ {votesAgainst} against</span>
            </div>
        </div>
    );
};

// ── Proposal Card ──────────────────────────────────────────────────────────────
const ProposalCard: React.FC<{
    proposal: Proposal;
    communitySlug: string;
    isMember: boolean;
}> = ({ proposal, communitySlug, isMember }) => {
    const { accessToken } = useAuth();
    const [expanded, setExpanded] = useState(false);
    const [voting, setVoting] = useState(false);
    const [voted, setVoted] = useState<string | null>(null);
    const [voteError, setVoteError] = useState<string | null>(null);

    const handleVote = async (choice: 'for' | 'against' | 'abstain') => {
        if (!accessToken) return;
        setVoting(true);
        setVoteError(null);
        try {
            await castVote(communitySlug, proposal.id, choice, accessToken);
            setVoted(choice);
        } catch (e: any) {
            setVoteError(e.message);
        } finally {
            setVoting(false);
        }
    };

    const canVote = isMember && proposal.status === 'active' && !voted;

    return (
        <div className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden">
            {/* Card Header */}
            <div
                className="flex items-start gap-3 p-4 cursor-pointer hover:bg-canvas/40 transition-colors"
                onClick={() => setExpanded((p) => !p)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${STATUS_STYLES[proposal.status] ?? STATUS_STYLES.draft}`}>
                            {proposal.status}
                        </span>
                        <span className="text-[10px] text-inkLight/50">
                            {proposal.status === 'active' ? timeLeft(proposal.voting_ends_at) : timeAgo(proposal.created_at)}
                        </span>
                    </div>
                    <h3 className="text-sm font-black text-ink line-clamp-2">{proposal.title}</h3>
                    <p className="text-xs text-inkLight/70 mt-0.5">
                        by {proposal.created_by?.display_name ?? 'Unknown'}
                    </p>
                </div>
                {expanded
                    ? <ChevronUp className="w-4 h-4 text-inkLight/50 shrink-0 mt-1" />
                    : <ChevronDown className="w-4 h-4 text-inkLight/50 shrink-0 mt-1" />
                }
            </div>

            {/* Expanded */}
            {expanded && (
                <div className="px-4 pb-4 border-t border-borderSubtle/60 pt-3">
                    <p className="text-sm text-inkLight leading-relaxed mb-3">{proposal.description}</p>

                    <VoteBar
                        votesFor={proposal.votes_for}
                        votesAgainst={proposal.votes_against}
                        quorum={proposal.quorum_required}
                    />

                    {/* Vote actions */}
                    {canVote && !voting && (
                        <div className="flex gap-2 mt-4">
                            {(['for', 'against', 'abstain'] as const).map((choice) => (
                                <button
                                    key={choice}
                                    onClick={() => handleVote(choice)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors border ${
                                        choice === 'for'
                                            ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                                            : choice === 'against'
                                            ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                                            : 'border-borderSubtle text-inkLight hover:bg-canvas'
                                    }`}
                                >
                                    {choice === 'for' ? '✓ For' : choice === 'against' ? '✗ Against' : '− Abstain'}
                                </button>
                            ))}
                        </div>
                    )}

                    {voting && (
                        <div className="flex justify-center mt-4">
                            <Loader2 className="w-5 h-5 animate-spin text-gold" />
                        </div>
                    )}

                    {voted && (
                        <p className="mt-3 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Voted <strong>{voted}</strong>
                        </p>
                    )}

                    {voteError && (
                        <p className="mt-3 text-center text-xs text-red-400 flex items-center justify-center gap-1">
                            <XCircle className="w-4 h-4" />
                            {voteError}
                        </p>
                    )}

                    {!isMember && proposal.status === 'active' && (
                        <p className="mt-3 text-center text-[10px] text-inkLight/50">Join the community to vote</p>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Create Proposal Form ───────────────────────────────────────────────────────
const CreateProposalForm: React.FC<{
    communitySlug: string;
    onCreated: (p: Proposal) => void;
    onCancel: () => void;
}> = ({ communitySlug, onCreated, onCancel }) => {
    const { accessToken } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('general');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Default: starts now, ends in 3 days
    useEffect(() => {
        const now = new Date();
        const end = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        setStartDate(now.toISOString().slice(0, 16));
        setEndDate(end.toISOString().slice(0, 16));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !title || !description) return;
        setSubmitting(true);
        setError(null);
        try {
            const p = await createProposal(
                communitySlug,
                {
                    title,
                    description,
                    proposal_type: type,
                    voting_starts_at: new Date(startDate).toISOString(),
                    voting_ends_at: new Date(endDate).toISOString(),
                },
                accessToken
            );
            onCreated(p);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const inputClass = "w-full bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold/60 transition-colors";

    return (
        <form onSubmit={handleSubmit} className="bg-surface border border-gold/30 rounded-2xl p-5 space-y-4 mb-5">
            <h3 className="text-sm font-black text-ink">New Proposal</h3>
            <input
                className={inputClass}
                placeholder="Proposal title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
            />
            <textarea
                className={`${inputClass} resize-none`}
                placeholder="Describe the proposal in detail..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
            />
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] text-inkLight/70 block mb-1">Type</label>
                    <select
                        className={inputClass}
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                    >
                        <option value="general">General</option>
                        <option value="spending">Spending</option>
                        <option value="rule_change">Rule Change</option>
                        <option value="role_change">Role Change</option>
                        <option value="agent_config">Agent Config</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] text-inkLight/70 block mb-1">Voting period</label>
                    <input
                        type="datetime-local"
                        className={inputClass}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2 rounded-xl text-xs font-black border border-borderSubtle text-inkLight hover:text-ink transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting || !title || !description}
                    className="flex-1 py-2 rounded-xl text-xs font-black bg-gold text-black hover:bg-gold/90 transition-colors disabled:opacity-40"
                >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Proposal'}
                </button>
            </div>
        </form>
    );
};

// ── Main GovernancePanel ───────────────────────────────────────────────────────
interface GovernancePanelProps {
    communitySlug: string;
    isMember: boolean;
    userRole: string | null;
}

export const GovernancePanel: React.FC<GovernancePanelProps> = ({
    communitySlug, isMember, userRole,
}) => {
    const { accessToken } = useAuth();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'passed' | 'rejected'>('all');

    useEffect(() => {
        setLoading(true);
        fetchProposals(communitySlug, accessToken || undefined)
            .then((d) => setProposals(d.results ?? []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [communitySlug]);

    const filtered = filter === 'all'
        ? proposals
        : proposals.filter((p) => p.status === filter);

    return (
        <div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                    {(['all', 'active', 'passed', 'rejected'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors capitalize ${
                                filter === f
                                    ? 'bg-gold text-black'
                                    : 'bg-surface border border-borderSubtle text-inkLight hover:text-ink'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                {isMember && !creating && (
                    <button
                        onClick={() => setCreating(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border border-gold/40 text-gold hover:bg-gold/10 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Propose
                    </button>
                )}
            </div>

            {creating && (
                <CreateProposalForm
                    communitySlug={communitySlug}
                    onCreated={(p) => {
                        setProposals((prev) => [p, ...prev]);
                        setCreating(false);
                    }}
                    onCancel={() => setCreating(false)}
                />
            )}

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-gold" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-surface border border-borderSubtle flex items-center justify-center text-inkLight/30 mb-4">
                        <ScrollText className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-black text-inkLight mb-1">No proposals yet</p>
                    {isMember && (
                        <p className="text-xs text-inkLight/50">
                            Start a proposal to shape this community
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((p) => (
                        <ProposalCard
                            key={p.id}
                            proposal={p}
                            communitySlug={communitySlug}
                            isMember={isMember}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default GovernancePanel;
