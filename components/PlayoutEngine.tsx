import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Wallet, Tv, Upload, CheckCircle, XCircle, Loader2,
    Radio, Square, RefreshCw, ChevronDown, ChevronUp, Film,
    AlertCircle, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { request } from '@stacks/connect';
import { useAuth } from '../lib/AuthContext';
import {
    getDAPStatus, registerDAP, getDAPBalance, getDAPTransactions,
    getStacksWalletBalances,
    DAPStatus, DAPUser, DAPBalance, DAPTransaction, StacksWalletBalances,
    dcpeCreatorUpload, dcpeCreatorPrep, dcpeCreatorPrepStatus,
    dcpeCreatorSetPlaylist, dcpeCreatorStreamStart, dcpeCreatorStreamStop,
    dcpeCreatorStatus, CreatorPrepFileStatus,
} from '../lib/api';

const PLAYOUT_COST = 200;
const MAX_FILES = 5;
const ACCEPTED_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska'];

interface FileEntry {
    id: string;           // local temp id before upload
    file: File;
    filename: string;
    status: 'pending' | 'uploading' | 'uploaded' | 'error';
    file_id?: string;     // assigned by DCPE after upload
    error?: string;
}

export const PlayoutEngine: React.FC = () => {
    const { accessToken, backendUser } = useAuth();

    // ── DAP state (mirrors ContentEngine) ────────────────────────────────────
    const [dapStatus, setDapStatus]         = useState<DAPStatus | null>(null);
    const [userBalance, setUserBalance]     = useState<DAPBalance | null>(null);
    const [userInfo, setUserInfo]           = useState<DAPUser | null>(null);
    const [transactions, setTransactions]   = useState<DAPTransaction[]>([]);
    const [isRegistered, setIsRegistered]   = useState(false);
    const [walletBalances, setWalletBalances] = useState<StacksWalletBalances | null>(null);
    const [isRefreshing, setIsRefreshing]   = useState(false);
    const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
    const [stxAmount, setStxAmount]         = useState('1');
    const [depositPending, setDepositPending] = useState(false);
    const [copiedAddress, setCopiedAddress] = useState(false);
    const [txHistoryOpen, setTxHistoryOpen] = useState(false);

    // ── Upload state ─────────────────────────────────────────────────────────
    const [files, setFiles]                 = useState<FileEntry[]>([]);
    const [sessionId, setSessionId]         = useState<string | null>(null);
    const [isDragging, setIsDragging]       = useState(false);
    const fileInputRef                      = useRef<HTMLInputElement>(null);

    // ── Prep state ────────────────────────────────────────────────────────────
    const [prepId, setPrepId]               = useState<string | null>(null);
    const [folderSlug, setFolderSlug]       = useState<string | null>(null);
    const [prepJobStatus, setPrepJobStatus] = useState<'idle' | 'processing' | 'ready' | 'partial' | 'error'>('idle');
    const [prepFileStatuses, setPrepFileStatuses] = useState<Record<string, CreatorPrepFileStatus>>({});
    const [isPrepping, setIsPrepping]       = useState(false);
    const [prepError, setPrepError]         = useState<string | null>(null);

    // ── Stream state ──────────────────────────────────────────────────────────
    const [isStreaming, setIsStreaming]     = useState(false);
    const [isGoingLive, setIsGoingLive]     = useState(false);
    const [isStopping, setIsStopping]       = useState(false);
    const [streamError, setStreamError]     = useState<string | null>(null);

    // ── UI ────────────────────────────────────────────────────────────────────
    const [loading, setLoading]             = useState(true);

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const stopPolling = () => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };

    // ── DAP helpers ───────────────────────────────────────────────────────────
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
            console.error('[PlayoutEngine] balance refresh failed:', e);
        } finally {
            setIsRefreshing(false);
        }
    };

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!accessToken || !backendUser) { setLoading(false); return; }

        const init = async () => {
            setLoading(true);
            try {
                const [status, dcpeState] = await Promise.all([
                    getDAPStatus(accessToken),
                    dcpeCreatorStatus(accessToken).catch(() => null),
                ]);
                setDapStatus(status);
                if (dcpeState) setIsStreaming(!!dcpeState.rtmp_connected && !!dcpeState.streaming_enabled);

                const addr = backendUser.stacks_address;
                if (addr) {
                    const reg = await registerDAP(accessToken, addr);
                    setUserInfo(reg);
                    setIsRegistered(true);
                    await refreshBalance(addr);
                }
            } catch (e) {
                console.error('[PlayoutEngine] init failed:', e);
            } finally {
                setLoading(false);
            }
        };
        init();
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, backendUser]);

    // ── Prep polling ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!prepId || !accessToken) return;

        pollRef.current = setInterval(async () => {
            try {
                const result = await dcpeCreatorPrepStatus(prepId, accessToken);
                const statusMap: Record<string, CreatorPrepFileStatus> = {};
                result.files.forEach(f => { statusMap[f.file_id] = f; });
                setPrepFileStatuses(statusMap);
                setPrepJobStatus(result.status);

                if (result.status !== 'processing') {
                    stopPolling();
                    setIsPrepping(false);
                }
            } catch (e) {
                console.error('[PlayoutEngine] prep poll failed:', e);
            }
        }, 3000);

        return () => stopPolling();
    }, [prepId, accessToken]);

    // ── File handling ─────────────────────────────────────────────────────────
    const uploadFile = async (entry: FileEntry, currentSessionId: string | null) => {
        if (!accessToken) return { entry, newSessionId: currentSessionId };

        setFiles(prev => prev.map(f => f.id === entry.id ? { ...f, status: 'uploading' } : f));
        try {
            const result = await dcpeCreatorUpload(entry.file, accessToken, currentSessionId || undefined);
            const newSession = result.session_id;
            setFiles(prev => prev.map(f =>
                f.id === entry.id
                    ? { ...f, status: 'uploaded', file_id: result.file_id }
                    : f
            ));
            return { entry, newSessionId: newSession };
        } catch (e: any) {
            setFiles(prev => prev.map(f =>
                f.id === entry.id ? { ...f, status: 'error', error: e.message } : f
            ));
            return { entry, newSessionId: currentSessionId };
        }
    };

    const handleFiles = useCallback(async (incoming: File[]) => {
        const accepted = incoming
            .filter(f => ACCEPTED_TYPES.includes(f.type) || f.name.match(/\.(mp4|mov|webm|mkv|avi)$/i))
            .slice(0, MAX_FILES - files.length);

        if (!accepted.length) return;

        const entries: FileEntry[] = accepted.map(f => ({
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            file: f,
            filename: f.name,
            status: 'pending',
        }));

        setFiles(prev => [...prev, ...entries]);
        setPrepId(null);
        setFolderSlug(null);
        setPrepJobStatus('idle');
        setPrepFileStatuses({});
        setPrepError(null);

        // Upload sequentially so session_id carries through
        let currentSession = sessionId;
        for (const entry of entries) {
            const { newSessionId } = await uploadFile(entry, currentSession);
            if (newSessionId && !currentSession) {
                currentSession = newSessionId;
                setSessionId(newSessionId);
            }
        }
    }, [files.length, sessionId, accessToken]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(Array.from(e.dataTransfer.files));
    }, [handleFiles]);

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        if (files.length <= 1) {
            setSessionId(null);
            setPrepId(null);
            setFolderSlug(null);
            setPrepJobStatus('idle');
            setPrepFileStatuses({});
        }
    };

    // ── Prep ──────────────────────────────────────────────────────────────────
    const handlePrep = async () => {
        if (!accessToken) return;
        const uploadedIds = files.filter(f => f.status === 'uploaded' && f.file_id).map(f => f.file_id!);
        if (!uploadedIds.length) return;

        setIsPrepping(true);
        setPrepError(null);
        setPrepJobStatus('processing');
        stopPolling();

        try {
            const result = await dcpeCreatorPrep(uploadedIds, accessToken);
            setPrepId(result.prep_id);
            setFolderSlug(result.folder_slug);
        } catch (e: any) {
            setPrepError(e.message || 'Failed to start normalization');
            setIsPrepping(false);
            setPrepJobStatus('error');
        }
    };

    // ── Go Live / Stop ────────────────────────────────────────────────────────
    const handleGoLive = async () => {
        if (!accessToken || !folderSlug) return;
        setIsGoingLive(true);
        setStreamError(null);
        try {
            await dcpeCreatorSetPlaylist(folderSlug, accessToken);
            await dcpeCreatorStreamStart(accessToken);
            setIsStreaming(true);
        } catch (e: any) {
            setStreamError(e.message || 'Failed to go live');
        } finally {
            setIsGoingLive(false);
        }
    };

    const handleStop = async () => {
        if (!accessToken) return;
        setIsStopping(true);
        setStreamError(null);
        try {
            await dcpeCreatorStreamStop(accessToken);
            setIsStreaming(false);
        } catch (e: any) {
            setStreamError(e.message || 'Failed to stop stream');
        } finally {
            setIsStopping(false);
        }
    };

    // ── DAP buy credits ───────────────────────────────────────────────────────
    const handleBuyCredits = async () => {
        if (!dapStatus || !userInfo || depositPending) return;
        const microStx = Math.round(parseFloat(stxAmount) * 1_000_000);
        if (isNaN(microStx) || microStx <= 0) return;
        setDepositPending(true);
        try {
            await request('stx_transferStx', {
                amount: microStx.toString(),
                recipient: dapStatus.deposit_address,
                memo: userInfo.stacks_address,
            });
        } catch (e) {
            console.error('[PlayoutEngine] STX transfer failed:', e);
        } finally {
            setDepositPending(false);
        }
    };

    // ── Derived state ─────────────────────────────────────────────────────────
    const balance            = parseFloat(userBalance?.balance || '0');
    const hasEnoughCredits   = isRegistered && balance >= PLAYOUT_COST;
    const uploadedFiles      = files.filter(f => f.status === 'uploaded');
    const canPrep            = uploadedFiles.length > 0 && !isPrepping && prepJobStatus === 'idle';
    const allFilesReady      = prepJobStatus === 'ready';
    const canGoLive          = allFilesReady && !isStreaming && !isGoingLive && !!folderSlug;

    // ── Render ────────────────────────────────────────────────────────────────
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
                <h1 className="text-4xl font-bold text-ink mb-2">Playout Engine</h1>
                <p className="text-inkLight font-medium">Upload clips, normalize, and go live — all from one panel.</p>
            </div>

            {/* ── DAP Wallet ─────────────────────────────────────────────────── */}
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
                        <p className="text-sm font-bold text-ink">Connect your wallet to get started</p>
                    ) : !backendUser.stacks_address ? (
                        <p className="text-sm text-red-500 font-medium">No Stacks address on your account. Contact support.</p>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-gold" />
                            <p className="text-sm text-inkLight">Connecting to DAP...</p>
                        </div>
                    )
                ) : (
                    <div className="space-y-4">
                        {/* Balance row */}
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-3xl font-black text-ink">{balance.toLocaleString()}</p>
                                <p className="text-xs text-inkLight">credits available</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => backendUser?.stacks_address && refreshBalance(backendUser.stacks_address)}
                                    disabled={isRefreshing}
                                    className="p-2 hover:bg-surface rounded-xl transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 text-inkLight ${isRefreshing ? 'animate-spin' : ''}`} />
                                </button>
                                <div className={`px-3 py-1.5 rounded-xl text-sm font-bold ${balance >= PLAYOUT_COST ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}`}>
                                    {balance >= PLAYOUT_COST ? `${PLAYOUT_COST} credits required ✓` : `Need ${PLAYOUT_COST} credits`}
                                </div>
                            </div>
                        </div>

                        {/* Buy credits */}
                        <button
                            onClick={() => setBuyCreditsOpen(o => !o)}
                            className="flex items-center gap-2 text-sm font-bold text-gold hover:text-gold/80 transition-colors"
                        >
                            {buyCreditsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {balance < PLAYOUT_COST ? 'Buy credits to get started' : 'Buy more credits'}
                        </button>

                        <AnimatePresence>
                            {buyCreditsOpen && dapStatus && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="bg-surface rounded-2xl p-4 space-y-3 border border-borderSubtle">
                                        <p className="text-xs text-inkLight">
                                            Send STX to earn credits. Rate: <span className="font-bold text-ink">{dapStatus.credit_rate} credits / STX</span>
                                        </p>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={stxAmount}
                                                onChange={e => setStxAmount(e.target.value)}
                                                min="0.01"
                                                step="0.1"
                                                className="flex-1 bg-canvas border border-borderSubtle rounded-xl px-3 py-2 text-sm"
                                                placeholder="STX amount"
                                            />
                                            <button
                                                onClick={handleBuyCredits}
                                                disabled={depositPending}
                                                className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
                                            >
                                                {depositPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-mono text-inkLight truncate flex-1">{dapStatus.deposit_address}</p>
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(dapStatus.deposit_address); setCopiedAddress(true); setTimeout(() => setCopiedAddress(false), 2000); }}
                                                className="text-xs text-gold font-bold shrink-0"
                                            >
                                                {copiedAddress ? 'Copied!' : 'Copy'}
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-inkLight/70">Credits appear within ~1 min after transaction confirms.</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tx history toggle */}
                        {transactions.length > 0 && (
                            <button
                                onClick={() => setTxHistoryOpen(o => !o)}
                                className="flex items-center gap-2 text-xs text-inkLight hover:text-ink transition-colors"
                            >
                                {txHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
                            </button>
                        )}
                        <AnimatePresence>
                            {txHistoryOpen && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {transactions.slice(0, 10).map((tx, i) => (
                                            <div key={i} className="flex justify-between text-xs px-2 py-1 rounded-lg hover:bg-surface">
                                                <span className="text-inkLight">{new Date(tx.created_at || '').toLocaleDateString()}</span>
                                                <span className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} cr
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </section>

            {/* ── Upload + Prep (gated on credits) ───────────────────────────── */}
            {!hasEnoughCredits ? (
                <div className="bg-surface border border-borderSubtle rounded-3xl p-8 text-center">
                    <AlertCircle className="w-10 h-10 text-gold mx-auto mb-3" />
                    <p className="font-bold text-ink mb-1">Insufficient credits</p>
                    <p className="text-sm text-inkLight">You need at least {PLAYOUT_COST} DAP credits to use the Playout Engine.</p>
                </div>
            ) : (
                <>
                    {/* ── Drop zone ───────────────────────────────────────────── */}
                    <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 md:p-8 shadow-soft space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-gold/10 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-ink">Upload Clips</h2>
                                <p className="text-xs text-inkLight">Max {MAX_FILES} files · MP4, MOV, WebM</p>
                            </div>
                        </div>

                        {files.length < MAX_FILES && (
                            <div
                                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${isDragging ? 'border-gold bg-gold/5' : 'border-borderSubtle hover:border-gold/50 hover:bg-surface/50'}`}
                            >
                                <Film className="w-10 h-10 text-inkLight mx-auto mb-3" />
                                <p className="font-bold text-ink">Drop video files here</p>
                                <p className="text-sm text-inkLight mt-1">or click to browse ({MAX_FILES - files.length} slot{MAX_FILES - files.length !== 1 ? 's' : ''} remaining)</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/*"
                                    multiple
                                    className="hidden"
                                    onChange={e => e.target.files && handleFiles(Array.from(e.target.files))}
                                />
                            </div>
                        )}

                        {/* File list */}
                        {files.length > 0 && (
                            <div className="space-y-2">
                                {files.map(entry => {
                                    const prepFile = entry.file_id ? prepFileStatuses[entry.file_id] : null;
                                    const displayStatus = prepFile?.status ?? entry.status;
                                    return (
                                        <div key={entry.id} className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-borderSubtle">
                                            {displayStatus === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-gold shrink-0" />}
                                            {displayStatus === 'uploaded' && prepJobStatus === 'idle' && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                                            {displayStatus === 'queued' && <div className="w-4 h-4 rounded-full border-2 border-inkLight shrink-0" />}
                                            {displayStatus === 'normalizing' && <Loader2 className="w-4 h-4 animate-spin text-gold shrink-0" />}
                                            {displayStatus === 'ready' && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                                            {(displayStatus === 'error' || entry.status === 'error') && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                            {displayStatus === 'pending' && <div className="w-4 h-4 rounded-full border-2 border-borderSubtle shrink-0" />}

                                            <span className="text-sm font-medium text-ink truncate flex-1">{entry.filename}</span>
                                            <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full ${
                                                displayStatus === 'ready' ? 'bg-green-500/10 text-green-600' :
                                                displayStatus === 'normalizing' ? 'bg-gold/10 text-gold' :
                                                displayStatus === 'error' ? 'bg-red-500/10 text-red-500' :
                                                'bg-surface text-inkLight'
                                            }`}>
                                                {displayStatus}
                                            </span>
                                            {prepJobStatus === 'idle' && entry.status !== 'uploading' && (
                                                <button onClick={() => removeFile(entry.id)} className="text-inkLight hover:text-red-500 text-xs ml-1 shrink-0">✕</button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Prepare button */}
                        {files.length > 0 && (
                            <button
                                onClick={handlePrep}
                                disabled={!canPrep}
                                className="w-full py-3 bg-gold text-canvas font-black rounded-2xl hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isPrepping ? <><Loader2 className="w-4 h-4 animate-spin" /> Normalizing...</> : 'Prepare Clips'}
                            </button>
                        )}

                        {prepError && (
                            <p className="text-sm text-red-500 font-medium flex items-center gap-2">
                                <XCircle className="w-4 h-4 shrink-0" />{prepError}
                            </p>
                        )}
                    </section>

                    {/* ── Go Live / Stop ──────────────────────────────────────── */}
                    {(prepJobStatus !== 'idle' || isStreaming) && (
                        <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 md:p-8 shadow-soft">
                            <div className="flex items-center gap-3 mb-6">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isStreaming ? 'bg-red-500/10' : 'bg-gold/10'}`}>
                                    <Radio className={`w-5 h-5 ${isStreaming ? 'text-red-500' : 'text-gold'}`} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-ink">Stream Control</h2>
                                    <p className="text-xs text-inkLight">
                                        {isStreaming ? 'Live — stream is active' : allFilesReady ? 'Ready to go live' : 'Normalizing clips...'}
                                    </p>
                                </div>
                                {isStreaming && (
                                    <span className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-xs font-black uppercase tracking-wider">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                        Live
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleGoLive}
                                    disabled={!canGoLive}
                                    className="flex-1 py-3.5 bg-gold text-canvas font-black rounded-2xl hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isGoingLive
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
                                        : <><Play className="w-4 h-4" /> Go Live</>}
                                </button>
                                <button
                                    onClick={handleStop}
                                    disabled={!isStreaming || isStopping}
                                    className="flex-1 py-3.5 bg-red-500/10 text-red-500 border border-red-500/30 font-black rounded-2xl hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isStopping
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Stopping...</>
                                        : <><Square className="w-4 h-4" /> Stop</>}
                                </button>
                            </div>

                            {streamError && (
                                <p className="mt-3 text-sm text-red-500 font-medium flex items-center gap-2">
                                    <XCircle className="w-4 h-4 shrink-0" />{streamError}
                                </p>
                            )}
                        </section>
                    )}
                </>
            )}

            {/* ── Restream Embed ──────────────────────────────────────────────── */}
            <section>
                <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-3">Live Preview</p>
                <div className="rounded-2xl overflow-hidden border border-borderSubtle">
                    <iframe
                        src="https://player.restream.io/?token=34663e6520564a09b488b82266a870da"
                        allow="autoplay"
                        allowFullScreen
                        frameBorder={0}
                        style={{ width: '100%', aspectRatio: '16/9', display: 'block' }}
                    />
                </div>
            </section>
        </div>
    );
};
