import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Activity, AlertTriangle, ArrowDown, ArrowUp, Calendar, Check, CheckCircle, ChevronDown, ChevronRight, ChevronUp, Clock, Crown, Disc,
    Eye, EyeOff, Loader2, List, Monitor, Pause, Play, Plus, Radio, RefreshCw,
    Save, Server, SkipBack, SkipForward, ToggleLeft, ToggleRight, Trash2, Tv, Upload, Volume2, Wifi, WifiOff, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import {
    dcpeHealth, dcpeStatus, dcpePlaylists, dcpeSetPlaylist,
    dcpeAdvance, dcpeStreamStart, dcpeStreamStop, dcpeCreateFolder, dcpeUpload,
    dcpeSetPlaylistOrder,
    DCPEStatus, DCPEPlaylist,
    fetchRTMPDestinations, createRTMPDestination, updateRTMPDestination, deleteRTMPDestination,
    RTMPDestination, PLATFORM_LABELS, DEFAULT_RTMP_URLS,
    fetchBroadcastSchedule, updateBroadcastSchedule, BroadcastSchedule, DAY_LABELS,
    fetchSubscription, upgradeSubscription, SubscriptionData, PLAN_LIMITS
} from '../lib/api';

interface PlayoutControlProps {
    onNavigate: (page: string, id?: string | number) => void;
    adminView?: boolean;
}

interface QueueItem {
    id: string;
    name: string;
    folder: string;
    track_count: number;
}

export const PlayoutControl: React.FC<PlayoutControlProps> = ({ onNavigate, adminView = false }) => {
    const { accessToken, backendUser } = useAuth();
    // Staff flag — gates stream control buttons (advance/set-playlist)
    // until per-creator Railway instances are provisioned
    const isStaff = !!backendUser?.is_staff;

    // Engine state
    const [status, setStatus] = useState<DCPEStatus | null>(null);
    const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
    const [playlists, setPlaylists] = useState<DCPEPlaylist[]>([]);
    const [loadingPlaylists, setLoadingPlaylists] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState(false);

    // Run order queue (browser-only)
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [currentQueueIndex, setCurrentQueueIndex] = useState(0);

    // Actions
    const [advancing, setAdvancing] = useState(false);

    // File upload
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // RTMP Destinations
    const [rtmpDestinations, setRtmpDestinations] = useState<RTMPDestination[]>([]);
    const [showRtmpForm, setShowRtmpForm] = useState(false);
    const [rtmpExpanded, setRtmpExpanded] = useState(false);
    const [savingRtmp, setSavingRtmp] = useState(false);
    const [newRtmp, setNewRtmp] = useState({ platform: 'youtube', stream_key: '', rtmp_url: DEFAULT_RTMP_URLS['youtube'], label: '' });
    const [showStreamKey, setShowStreamKey] = useState(false);

    // Broadcast Schedule
    const [schedule, setSchedule] = useState<BroadcastSchedule>({ broadcast_time: null, broadcast_days: [], broadcast_timezone: 'UTC' });
    const [scheduleExpanded, setScheduleExpanded] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [editTime, setEditTime] = useState('');
    const [editDays, setEditDays] = useState<number[]>([]);
    const [editTimezone, setEditTimezone] = useState('UTC');

    // Subscription
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [subExpanded, setSubExpanded] = useState(false);

    // Activity log
    const [activityLog, setActivityLog] = useState<{ time: string; message: string; type: 'info' | 'error' | 'success' }[]>([]);

    // Upgrade
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [paymentToken, setPaymentToken] = useState<'STX' | 'USDCx' | 'sBTC'>('USDCx');
    // Plan upgrade prices (hackathon demo — same price for all plans)
    const PLAN_PRICES_USDCX: Record<string, number> = { starter: 1, pro: 1, enterprise: 1 };
    const PLAN_PRICES_STX: Record<string, number> = { starter: 1, pro: 1, enterprise: 1 };
    const PLAN_PRICES_SBTC: Record<string, string> = { starter: '0.00000150', pro: '0.00000150', enterprise: '0.00000150' };

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const log = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
        const time = new Date().toLocaleTimeString();
        setActivityLog(prev => [{ time, message, type }, ...prev].slice(0, 50));
    }, []);

    // -----------------------------------------------------------------------
    // Data fetching
    // -----------------------------------------------------------------------

    const checkHealth = useCallback(async () => {
        if (!accessToken) return;
        try {
            const data = await dcpeHealth(accessToken);
            const healthy = data.status === 'ok';
            setIsHealthy(healthy);
            if (healthy) {
                log(`DCPE online`, 'success');
            } else {
                log(`DCPE offline: ${data.error || data.status || 'unknown'}`, 'error');
            }
        } catch (err) {
            setIsHealthy(false);
            log(`Health check failed: ${err}`, 'error');
        }
    }, [accessToken, log]);

    const fetchStatus = useCallback(async () => {
        if (!accessToken) return;
        setLoadingStatus(true);
        try {
            const data = await dcpeStatus(accessToken);
            setStatus(data);
            if (data.last_error) {
                log(`Error from DCPE: ${data.last_error}`, 'error');
            }
        } catch (err) {
            log(`Status fetch failed: ${err}`, 'error');
        } finally {
            setLoadingStatus(false);
        }
    }, [accessToken, log]);

    const fetchPlaylists = useCallback(async () => {
        if (!accessToken) return;
        setLoadingPlaylists(true);
        try {
            const data = await dcpePlaylists(accessToken);
            setPlaylists(data.playlists || []);
            log(`Loaded ${(data.playlists || []).length} playlists`, 'success');
        } catch (err) {
            log(`Playlist fetch failed: ${err}`, 'error');
        } finally {
            setLoadingPlaylists(false);
        }
    }, [accessToken, log]);

    // Load RTMP destinations
    const loadRTMPDestinations = useCallback(async () => {
        if (!accessToken) return;
        try {
            const data = await fetchRTMPDestinations(accessToken);
            setRtmpDestinations(data);
        } catch (err) {
            log(`RTMP load failed: ${err}`, 'error');
        }
    }, [accessToken, log]);

    // Load broadcast schedule
    const loadSchedule = useCallback(async () => {
        if (!accessToken) return;
        try {
            const data = await fetchBroadcastSchedule(accessToken);
            setSchedule(data);
            setEditTime(data.broadcast_time ? data.broadcast_time.substring(0, 5) : '');
            setEditDays(data.broadcast_days || []);
            setEditTimezone(data.broadcast_timezone || 'UTC');
        } catch (err) {
            log(`Schedule load failed: ${err}`, 'error');
        }
    }, [accessToken, log]);

    // Load subscription
    const loadSubscription = useCallback(async () => {
        if (!accessToken) return;
        try {
            const data = await fetchSubscription(accessToken);
            setSubscription(data);
        } catch (err) {
            log(`Subscription load failed: ${err}`, 'error');
        }
    }, [accessToken, log]);

    // Initial load + polling
    useEffect(() => {
        checkHealth();
        fetchStatus();
        fetchPlaylists();
        loadRTMPDestinations();
        loadSchedule();
        loadSubscription();

        // Poll status every 30 seconds
        pollRef.current = setInterval(() => {
            fetchStatus();
        }, 30000);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [checkHealth, fetchStatus, fetchPlaylists, loadRTMPDestinations, loadSchedule, loadSubscription]);

    // -----------------------------------------------------------------------
    // Actions
    // -----------------------------------------------------------------------

    const handleAddToQueue = (playlist: DCPEPlaylist) => {
        setQueue(prev => [...prev, {
            id: playlist.id,
            name: playlist.name,
            folder: playlist.folder,
            track_count: playlist.track_count,
        }]);
        log(`Added "${playlist.name}" to run order`, 'info');
    };

    const handleRemoveFromQueue = (index: number) => {
        setQueue(prev => prev.filter((_, i) => i !== index));
        if (currentQueueIndex >= index && currentQueueIndex > 0) {
            setCurrentQueueIndex(prev => prev - 1);
        }
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        setQueue(prev => {
            const newQueue = [...prev];
            [newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]];
            return newQueue;
        });
    };

    const handleMoveDown = (index: number) => {
        if (index >= queue.length - 1) return;
        setQueue(prev => {
            const newQueue = [...prev];
            [newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]];
            return newQueue;
        });
    };

    const handleAdvance = async () => {
        if (!accessToken || advancing || !isStaff) return;
        setAdvancing(true);
        try {
            log('⏭ Advancing to next track...', 'info');
            await dcpeAdvance(accessToken);
            setTimeout(fetchStatus, 3000);
        } catch (error: any) {
            log(`Advance failed: ${error.message}`, 'error');
        } finally {
            setAdvancing(false);
        }
    };

    const handleStreamStart = async () => {
        if (!accessToken || !isStaff) return;
        try {
            // Sync playlist order before starting stream
            if (queue.length > 0) {
                log('🔄 Syncing playlist order...', 'info');
                const folders = queue.map(item => item.folder);
                await dcpeSetPlaylistOrder(folders, accessToken);
                log('✅ Playlist order synced', 'success');
            }

            log('🚀 Signal sent: Starting RTMP stream...', 'info');
            await dcpeStreamStart(accessToken);
            setTimeout(fetchStatus, 2000);
        } catch (error: any) {
            log(`Stream start failed: ${error.message}`, 'error');
        }
    };

    const handleStreamStop = async () => {
        if (!accessToken || !isStaff) return;
        try {
            log('🛑 Signal sent: Stopping RTMP stream...', 'info');
            await dcpeStreamStop(accessToken);
            setTimeout(fetchStatus, 2000);
        } catch (error: any) {
            log(`Stream stop failed: ${error.message}`, 'error');
        }
    };

    // RTMP handlers
    const handleSaveRtmp = async () => {
        if (!accessToken || !newRtmp.stream_key) return;
        setSavingRtmp(true);
        try {
            await createRTMPDestination(newRtmp, accessToken);
            log(`Added ${PLATFORM_LABELS[newRtmp.platform]} destination`, 'success');
            setNewRtmp({ platform: 'youtube', stream_key: '', rtmp_url: DEFAULT_RTMP_URLS['youtube'], label: '' });
            setShowRtmpForm(false);
            setShowStreamKey(false);
            // Reload destinations from server — await to ensure state updates before re-render
            await loadRTMPDestinations();
        } catch (err) {
            log(`RTMP save failed: ${err}`, 'error');
        } finally {
            setSavingRtmp(false);
        }
    };

    // Broadcast schedule handler
    const handleSaveSchedule = async () => {
        if (!accessToken) return;
        setSavingSchedule(true);
        try {
            const data = await updateBroadcastSchedule({
                broadcast_time: editTime || null,
                broadcast_days: editDays,
                broadcast_timezone: editTimezone,
            }, accessToken);
            setSchedule(data);
            log('Broadcast schedule updated', 'success');
        } catch (err) {
            log(`Schedule save failed: ${err}`, 'error');
        } finally {
            setSavingSchedule(false);
        }
    };

    const toggleDay = (day: number) => {
        setEditDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort());
    };

    const handleToggleRtmp = async (dest: RTMPDestination) => {
        if (!accessToken) return;
        try {
            await updateRTMPDestination(dest.id, { is_active: !dest.is_active }, accessToken);
            loadRTMPDestinations();
        } catch (err) {
            log(`RTMP toggle failed: ${err}`, 'error');
        }
    };

    const handleDeleteRtmp = async (id: number) => {
        if (!accessToken) return;
        try {
            await deleteRTMPDestination(id, accessToken);
            log('RTMP destination removed', 'info');
            loadRTMPDestinations();
        } catch (err) {
            log(`RTMP delete failed: ${err}`, 'error');
        }
    };

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    // File upload handler
    const handleUpload = async () => {
        if (!accessToken || uploadFiles.length === 0) return;
        setUploading(true);
        try {
            const result = await dcpeUpload(uploadFiles, accessToken);
            if (result.ok || result.warning) {
                log(`Uploaded ${uploadFiles.length} file(s) successfully`, 'success');
                setUploadFiles([]);
                setUploadComplete(true);
                fetchPlaylists();
            } else {
                log(`Upload failed: ${result.error || JSON.stringify(result)}`, 'error');
            }
        } catch (err) {
            log(`Upload error: ${err}`, 'error');
        } finally {
            setUploading(false);
        }
    };

    // Onboarding step calculations
    const hasRTMP = rtmpDestinations.length > 0;
    const hasSchedule = !!(schedule.broadcast_time);
    const hasContent = playlists.length > 0;
    const onboardingComplete = uploadComplete || (hasRTMP && hasSchedule && hasContent);

    // Check if user has access to playout engine
    const hasPlayoutAccess = subscription && subscription.is_active && subscription.plan !== 'free';
    const subscriptionLoaded = subscription !== null;

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    // Upgrade prompt for free-tier users
    if (!adminView && subscriptionLoaded && !hasPlayoutAccess) {
        return (
            <div className="min-h-screen bg-background pt-24 pb-12 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-10">
                        <Crown className="w-14 h-14 text-gold mx-auto mb-4" />
                        <h1 className="text-2xl md:text-3xl font-black text-ink mb-3">Upgrade to Access Playout Engine</h1>
                        <p className="text-inkLight max-w-lg mx-auto text-sm md:text-base">
                            The 24/7 playout engine is available on Starter, Pro, and Enterprise plans.
                        </p>
                    </div>

                    {/* Token Selector */}
                    <div className="flex justify-center gap-2 mb-8">
                        {(['USDCx', 'STX', 'sBTC'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setPaymentToken(t)}
                                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                                    paymentToken === t
                                        ? 'bg-gold text-background shadow-md'
                                        : 'bg-surface border border-borderSubtle text-inkLight hover:border-gold/30'
                                }`}
                            >
                                Pay in {t}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {Object.entries(PLAN_LIMITS).map(([key, plan]) => {
                            const price = paymentToken === 'USDCx' ? PLAN_PRICES_USDCX[key] : paymentToken === 'sBTC' ? PLAN_PRICES_SBTC[key] : PLAN_PRICES_STX[key];
                            const isPaid = key !== 'free';
                            return (
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
                                {isPaid && (
                                    <p className="text-2xl font-black text-gold mb-3">
                                        {price} <span className="text-sm text-inkLight font-normal">{paymentToken}/mo</span>
                                    </p>
                                )}
                                <ul className="space-y-2 text-sm text-inkLight mb-4">
                                    <li className="flex items-center gap-2">
                                        <Tv className="w-3.5 h-3.5" />
                                        {plan.rtmp_destinations} RTMP dest{plan.rtmp_destinations > 1 ? 's' : ''}
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <List className="w-3.5 h-3.5" />
                                        {plan.playlists === -1 ? 'Unlimited' : plan.playlists} playlists
                                    </li>
                                    {key !== 'free' && (
                                        <li className="flex items-center gap-2 text-green-400">
                                            <Radio className="w-3.5 h-3.5" />
                                            24/7 Playout Engine
                                        </li>
                                    )}
                                </ul>
                                {isPaid && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!accessToken || upgrading) return;
                                            setUpgrading(key);
                                            try {
                                                await upgradeSubscription(key, accessToken, {
                                                    senderAddress: backendUser?.stacks_address || '',
                                                    tokenType: paymentToken,
                                                });
                                                log(`Upgraded to ${plan.label}!`, 'success');
                                                loadSubscription();
                                            } catch (err: any) {
                                                if (err.name !== 'PaymentCancelledError') {
                                                    log(`Upgrade failed: ${err.message}`, 'error');
                                                }
                                            } finally {
                                                setUpgrading(null);
                                            }
                                        }}
                                        disabled={!!upgrading}
                                        className="w-full py-2.5 rounded-xl font-bold text-sm bg-gold text-background hover:bg-gold/90 disabled:opacity-50 transition-all"
                                    >
                                        {upgrading === key ? (
                                            <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Processing...</>
                                        ) : (
                                            `Select ${plan.label}`
                                        )}
                                    </button>
                                )}
                            </div>
                            );
                        })}
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-inkLight">Payment is via x402 — your Stacks wallet will prompt for approval.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Onboarding wizard for new paid subscribers
    if (!adminView && hasPlayoutAccess && !onboardingComplete) {
        const steps = [
            { label: 'Stream Destination', icon: Wifi, done: hasRTMP, description: 'Add at least one RTMP destination (YouTube, Twitch, etc.)' },
            { label: 'Broadcast Schedule', icon: Calendar, done: hasSchedule, description: 'Set your daily broadcast time and days' },
            { label: 'Upload Content', icon: Upload, done: hasContent || uploadComplete, description: 'Upload video files to your content library' },
        ];
        const currentStep = !hasRTMP ? 0 : !hasSchedule ? 1 : 2;

        return (
            <div className="min-h-screen bg-background pt-24 pb-12">
                <div className="container mx-auto px-4 max-w-3xl">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 rounded-full bg-gold/10 border-2 border-gold/30 mx-auto mb-4 flex items-center justify-center">
                            <Radio className="w-8 h-8 text-gold" />
                        </div>
                        <h1 className="text-3xl font-black text-ink mb-2">Set Up Your Playout Engine</h1>
                        <p className="text-inkLight">Complete these steps to start streaming your content 24/7</p>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center justify-center gap-2 mb-10">
                        {steps.map((step, i) => (
                            <React.Fragment key={i}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step.done
                                    ? 'bg-green-400 text-background'
                                    : i === currentStep
                                        ? 'bg-gold text-background'
                                        : 'bg-surface border border-borderSubtle text-inkLight'
                                    }`}>
                                    {step.done ? <Check className="w-5 h-5" /> : i + 1}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`w-16 h-0.5 ${step.done ? 'bg-green-400' : 'bg-borderSubtle'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Steps */}
                    <div className="space-y-4">
                        {steps.map((step, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={`rounded-2xl border p-5 transition-all ${step.done
                                    ? 'border-green-400/30 bg-green-400/5'
                                    : i === currentStep
                                        ? 'border-gold/30 bg-gold/5'
                                        : 'border-borderSubtle bg-surface opacity-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    {step.done
                                        ? <CheckCircle className="w-5 h-5 text-green-400" />
                                        : <step.icon className={`w-5 h-5 ${i === currentStep ? 'text-gold' : 'text-inkLight'}`} />
                                    }
                                    <h3 className={`font-bold ${step.done ? 'text-green-400' : 'text-ink'}`}>{step.label}</h3>
                                    {step.done && <span className="text-xs bg-green-400/20 text-green-400 px-2 py-0.5 rounded-full ml-auto">Done</span>}
                                </div>
                                <p className="text-xs text-inkLight ml-8 mb-3">{step.description}</p>

                                {/* Step 1: RTMP form */}
                                {i === 0 && currentStep === 0 && !step.done && (
                                    <div className="ml-8 mt-3 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <select
                                                value={newRtmp.platform}
                                                onChange={e => {
                                                    const p = e.target.value;
                                                    setNewRtmp(prev => ({ ...prev, platform: p, rtmp_url: (DEFAULT_RTMP_URLS as Record<string, string>)[p] || prev.rtmp_url }));
                                                }}
                                                className="rounded-xl bg-transparent border border-inkLight/30 p-2.5 text-sm text-ink"
                                            >
                                                {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                                                    <option key={k} value={k}>{v}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                placeholder="Stream Key"
                                                value={newRtmp.stream_key}
                                                onChange={e => setNewRtmp(prev => ({ ...prev, stream_key: e.target.value }))}
                                                className="rounded-xl  bg-transparent border border-inkLight/30 p-2.5 text-sm text-ink"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveRtmp}
                                            disabled={!newRtmp.stream_key || savingRtmp}
                                            className="px-5 py-2 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/90 disabled:opacity-50 transition-all"
                                        >
                                            {savingRtmp ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Plus className="w-4 h-4 inline mr-2" />}
                                            Save Destination
                                        </button>
                                    </div>
                                )}

                                {/* Step 2: Schedule form */}
                                {i === 1 && currentStep === 1 && !step.done && (
                                    <div className="ml-8 mt-3 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs text-inkLight mb-1 block">Broadcast Time</label>
                                                <input
                                                    type="time"
                                                    value={editTime}
                                                    onChange={e => setEditTime(e.target.value)}
                                                    className="w-full rounded-xl bg-transparent border border-inkLight/30 p-2.5 text-sm text-ink"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-inkLight mb-1 block">Timezone</label>
                                                <select
                                                    value={editTimezone}
                                                    onChange={e => setEditTimezone(e.target.value)}
                                                    className="w-full rounded-xl bg-transparent border border-inkLight/30 p-2.5 text-sm text-ink"
                                                >
                                                    {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Africa/Johannesburg', 'Asia/Tokyo'].map(tz => (
                                                        <option key={tz} value={tz}>{tz}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {DAY_LABELS.map((day, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setEditDays(prev => prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx])}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${editDays.includes(idx)
                                                        ? 'bg-gold text-background'
                                                        : 'bg-transparent border border-inkLight/30 text-inkLight hover:border-gold/30'
                                                        }`}
                                                >
                                                    {day}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleSaveSchedule}
                                            disabled={!editTime || savingSchedule}
                                            className="px-5 py-2 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/90 disabled:opacity-50 transition-all"
                                        >
                                            {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Save className="w-4 h-4 inline mr-2" />}
                                            Save Schedule
                                        </button>
                                    </div>
                                )}

                                {/* Step 3: Upload form */}
                                {i === 2 && currentStep === 2 && !step.done && (
                                    <div className="ml-8 mt-3 space-y-3">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="video/*,.mp4,.mkv,.avi,.mov,.ts"
                                            className="hidden"
                                            onChange={e => {
                                                if (e.target.files) setUploadFiles(Array.from(e.target.files));
                                            }}
                                        />
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="border-2 border-dashed border-gold/30 rounded-2xl p-8 text-center cursor-pointer hover:bg-gold/5 transition-colors"
                                        >
                                            <Upload className="w-10 h-10 text-gold mx-auto mb-3" />
                                            <p className="text-sm text-ink font-bold">Click to select video files</p>
                                            <p className="text-xs text-inkLight mt-1">MP4, MKV, AVI, MOV, TS — multiple files supported</p>
                                        </div>

                                        {uploadFiles.length > 0 && (
                                            <div className="space-y-2">
                                                {uploadFiles.map((f, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-surface border border-borderSubtle">
                                                        <Disc className="w-4 h-4 text-gold shrink-0" />
                                                        <span className="text-sm text-ink truncate flex-1">{f.name}</span>
                                                        <span className="text-xs text-inkLight">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                                        <button onClick={() => setUploadFiles(prev => prev.filter((_, i) => i !== idx))} className="text-inkLight hover:text-red-400">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    onClick={handleUpload}
                                                    disabled={uploading}
                                                    className="w-full px-5 py-2.5 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/90 disabled:opacity-50 transition-all"
                                                >
                                                    {uploading
                                                        ? <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Uploading...</>
                                                        : <><Upload className="w-4 h-4 inline mr-2" /> Upload {uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''}</>
                                                    }
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Skip to playout link */}
                    <div className="text-center mt-8">
                        <button
                            onClick={() => { setUploadComplete(true); }}
                            className="text-xs text-inkLight hover:text-gold transition-colors underline"
                        >
                            Skip setup and go to Playout Control →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pt-24 pb-12">
            <div className="container mx-auto px-4 md:px-6 max-w-7xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-ink">
                            <Radio className="w-7 h-7 md:w-8 md:h-8 inline-block mr-2 text-gold" />
                            Playout Control
                        </h1>
                        <p className="text-inkLight text-sm mt-1">DCPE Engine Management — Stream Control Panel</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Health indicator */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${isHealthy === true
                            ? 'text-green-400 bg-green-400/10 border-green-400/30'
                            : isHealthy === false
                                ? 'text-red-400 bg-red-400/10 border-red-400/30'
                                : 'text-inkLight bg-surface border-borderSubtle'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${isHealthy === true ? 'bg-green-400 animate-pulse' : isHealthy === false ? 'bg-red-400' : 'bg-inkLight'}`} />
                            {isHealthy === true ? 'DCPE Online' : isHealthy === false ? 'DCPE Offline' : 'Checking...'}
                        </div>
                        <button
                            onClick={() => { checkHealth(); fetchStatus(); fetchPlaylists(); }}
                            className="p-2 rounded-xl bg-surface border border-borderSubtle hover:border-gold/30 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4 text-inkLight" />
                        </button>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="mb-8">
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
                </div>

                {/* Status Bar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
                >
                    {/* Engine Status */}
                    <div className={`rounded-2xl border p-4 ${status?.now_playing
                        ? 'border-green-400/30 bg-green-400/5'
                        : 'border-borderSubtle bg-surface'
                        }`}>
                        <div className="flex items-center gap-2 mb-1 text-inkLight">
                            <Activity className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wide">Engine</span>
                        </div>
                        <p className={`text-lg font-black ${status?.now_playing ? 'text-green-400' : 'text-inkLight'}`}>
                            {status?.now_playing ? 'Streaming' : 'Idle'}
                        </p>
                    </div>

                    {/* RTMP Status */}
                    <div className={`rounded-2xl border p-4 ${status?.rtmp_connected
                        ? 'border-green-400/30 bg-green-400/5'
                        : 'border-borderSubtle bg-surface'
                        }`}>
                        <div className="flex items-center gap-2 mb-1 text-inkLight">
                            {status?.rtmp_connected ? <Wifi className="w-4 h-4 text-green-400" /> : <WifiOff className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase tracking-wide">RTMP</span>
                        </div>
                        <p className={`text-lg font-black ${status?.rtmp_connected ? 'text-green-400' : 'text-inkLight'}`}>
                            {status?.rtmp_connected ? 'Connected' : 'Disconnected'}
                        </p>
                    </div>

                    {/* Playlist Loaded */}
                    <div className="rounded-2xl border border-borderSubtle bg-surface p-4">
                        <div className="flex items-center gap-2 mb-1 text-inkLight">
                            <List className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wide">Playlist</span>
                        </div>
                        <p className={`text-lg font-black ${status?.playlist_loaded ? 'text-gold' : 'text-inkLight'}`}>
                            {status?.playlist_loaded ? 'Loaded' : 'Not Loaded'}
                        </p>
                    </div>
                </motion.div>

                {/* Error Alert */}
                {status?.last_error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
                    >
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold text-red-400">Engine Error</h4>
                            <p className="text-xs text-red-300 mt-1">{status.last_error}</p>
                        </div>
                    </motion.div>
                )}

                {/* Now Playing — Music Player Bar */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-surface via-surface to-gold/5 border border-borderSubtle"
                >
                    <div className="flex items-center gap-6">
                        {/* Album art / disc */}
                        <div className="relative shrink-0">
                            <div className={`w-14 h-14 rounded-full bg-gradient-to-br from-gold/30 to-gold/5 border-2 border-gold/20 flex items-center justify-center ${status?.now_playing ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                                <Disc className="w-7 h-7 text-gold" />
                            </div>
                            {status?.rtmp_connected && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-2 border-surface flex items-center justify-center">
                                    <Wifi className="w-2.5 h-2.5 text-background" />
                                </div>
                            )}
                        </div>

                        {/* Track info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wider text-inkLight mb-0.5">
                                {status?.streaming_enabled && status?.rtmp_connected ? '● LIVE' : 'NOW PLAYING'}
                            </p>
                            <p className="text-xl font-black text-ink truncate">
                                {status?.now_playing || 'No track loaded'}
                            </p>
                            {queue.length > 0 && (
                                <p className="text-xs text-inkLight mt-0.5">
                                    Queue: {currentQueueIndex}/{queue.length} tracks
                                </p>
                            )}
                        </div>

                        {/* Playback controls */}
                        <div className="flex items-center gap-2">
                            {/* Stream Toggle Group */}
                            <div className="flex items-center bg-background/50 border border-borderSubtle rounded-full p-1 mr-2">
                                {!status?.streaming_enabled ? (
                                    <button
                                        type="button"
                                        onClick={handleStreamStart}
                                        disabled={queue.length === 0 || !isStaff}
                                        title={!isStaff ? 'Admin only' : queue.length === 0 ? 'Add folders to queue before streaming' : 'Enable RTMP pushing'}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isStaff && queue.length > 0
                                            ? 'bg-ink text-background hover:bg-ink/90' 
                                            : 'bg-ink/20 text-ink/40 cursor-not-allowed'}`}
                                    >
                                        <Wifi className="w-3.5 h-3.5" />
                                        Go Live
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleStreamStop}
                                        disabled={!isStaff}
                                        title={!isStaff ? 'Admin only' : 'Disable RTMP pushing'}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isStaff 
                                            ? 'bg-red-500 text-white hover:bg-red-600' 
                                            : 'bg-red-500/20 text-white/40 cursor-not-allowed'}`}
                                    >
                                        <WifiOff className="w-3.5 h-3.5" />
                                        End Stream
                                    </button>
                                )}
                            </div>

                            {/* Back button — staff only */}
                            <button
                                type="button"
                                onClick={() => {
                                    if (currentQueueIndex > 1) {
                                        setCurrentQueueIndex(prev => prev - 1);
                                        const prevItem = queue[currentQueueIndex - 2];
                                        if (prevItem && accessToken) {
                                            dcpeSetPlaylist(prevItem.id, accessToken).then(() => {
                                                dcpeAdvance(accessToken);
                                                log(`⏮ Back to "${prevItem.name}"`, 'info');
                                                setTimeout(fetchStatus, 3000);
                                            });
                                        }
                                    }
                                }}
                                disabled={currentQueueIndex <= 1 || !isStaff}
                                title={!isStaff ? 'Stream control is admin-only during shared playout' : ''}
                                className={`p-2 rounded-full transition-all ${currentQueueIndex > 1 && isStaff
                                    ? 'bg-surface border border-borderSubtle hover:border-gold/30 text-ink hover:text-gold'
                                    : 'bg-surface/50 text-inkLight/30 cursor-not-allowed border border-transparent'
                                    }`}
                            >
                                <SkipBack className="w-4 h-4" />
                            </button>

                            {/* Advance button — staff only */}
                            <button
                                type="button"
                                onClick={handleAdvance}
                                disabled={advancing || queue.length === 0 || !isStaff}
                                title={!isStaff ? 'Stream control is admin-only during shared playout' : ''}
                                className={`p-3 rounded-full font-bold transition-all ${queue.length > 0 && isStaff
                                    ? 'bg-gold text-background hover:bg-gold/90 shadow-lg shadow-gold/20'
                                    : 'bg-surface text-inkLight border border-borderSubtle cursor-not-allowed'
                                    }`}
                            >
                                {advancing
                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                    : <SkipForward className="w-5 h-5" />
                                }
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Main content: Library + Queue + Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Library Column */}
                    <div className="rounded-2xl bg-surface border border-borderSubtle p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                                <Volume2 className="w-4 h-4 inline mr-2 text-gold" />
                                Library
                            </h3>
                            <button
                                onClick={fetchPlaylists}
                                disabled={loadingPlaylists}
                                className="p-1.5 rounded-lg hover:bg-borderSubtle transition-colors"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 text-inkLight ${loadingPlaylists ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loadingPlaylists ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 text-gold animate-spin" />
                            </div>
                        ) : playlists.length === 0 ? (
                            <div className="text-center py-8">
                                <List className="w-10 h-10 text-inkLight mx-auto mb-3" />
                                <p className="text-xs text-inkLight">No playlists found</p>
                                <p className="text-xs text-inkLight mt-1">Run PREP to sync from Drive</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {playlists.map((playlist) => (
                                    <div
                                        key={playlist.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-background border border-borderSubtle hover:border-gold/30 transition-colors group"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-ink truncate">{playlist.name}</p>
                                            <p className="text-xs text-inkLight">{playlist.track_count} tracks</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddToQueue(playlist)}
                                            className="p-1.5 rounded-lg bg-gold/10 text-gold hover:bg-gold/20 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Add to queue"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Run Order (Queue) Column */}
                    <div className="rounded-2xl bg-surface border border-borderSubtle p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                                <List className="w-4 h-4 inline mr-2 text-gold" />
                                Run Order
                            </h3>
                            <span className="text-xs text-inkLight">{queue.length} items</span>
                        </div>

                        {queue.length === 0 ? (
                            <div className="text-center py-8">
                                <ChevronRight className="w-10 h-10 text-inkLight mx-auto mb-3" />
                                <p className="text-xs text-inkLight">Queue is empty</p>
                                <p className="text-xs text-inkLight mt-1">Add playlists from the Library</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {queue.map((item, index) => (
                                        <motion.div
                                            key={`${item.id}-${index}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${index === currentQueueIndex
                                                ? 'bg-gold/10 border-gold/30'
                                                : index < currentQueueIndex
                                                    ? 'bg-background border-borderSubtle opacity-50'
                                                    : 'bg-background border-borderSubtle'
                                                }`}
                                        >
                                            {/* Position */}
                                            <span className={`text-xs font-black w-5 text-center ${index === currentQueueIndex ? 'text-gold' : 'text-inkLight'}`}>
                                                {index + 1}
                                            </span>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate ${index === currentQueueIndex ? 'text-gold' : 'text-ink'}`}>
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-inkLight">{item.track_count} tracks</p>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0}
                                                    className="p-1 rounded hover:bg-borderSubtle disabled:opacity-30 transition-colors"
                                                >
                                                    <ArrowUp className="w-3 h-3 text-inkLight" />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index >= queue.length - 1}
                                                    className="p-1 rounded hover:bg-borderSubtle disabled:opacity-30 transition-colors"
                                                >
                                                    <ArrowDown className="w-3 h-3 text-inkLight" />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveFromQueue(index)}
                                                    className="p-1 rounded hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-400" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Activity Log Column */}
                    <div className="rounded-2xl bg-surface border border-borderSubtle p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                                <Activity className="w-4 h-4 inline mr-2 text-gold" />
                                Activity Log
                            </h3>
                            <button
                                onClick={() => setActivityLog([])}
                                className="text-xs text-inkLight hover:text-ink transition-colors"
                            >
                                Clear
                            </button>
                        </div>

                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                            {activityLog.length === 0 ? (
                                <p className="text-xs text-inkLight text-center py-4">No activity yet</p>
                            ) : (
                                activityLog.map((entry, i) => (
                                    <div key={i} className="flex gap-2 text-xs">
                                        <span className="text-inkLight shrink-0 font-mono">{entry.time}</span>
                                        <span className={
                                            entry.type === 'error' ? 'text-red-400' :
                                                entry.type === 'success' ? 'text-green-400' :
                                                    'text-inkLight'
                                        }>
                                            {entry.message}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RTMP Destinations */}
                <div className="mt-8 rounded-2xl bg-surface border border-borderSubtle overflow-hidden">
                    <button
                        onClick={() => setRtmpExpanded(!rtmpExpanded)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-borderSubtle/30 transition-colors"
                    >
                        <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                            <Tv className="w-4 h-4 inline mr-2 text-gold" />
                            Stream Destinations
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gold/10 text-gold font-bold">
                                {rtmpDestinations.length}
                            </span>
                        </h3>
                        {rtmpExpanded ? <ChevronUp className="w-4 h-4 text-inkLight" /> : <ChevronDown className="w-4 h-4 text-inkLight" />}
                    </button>

                    {rtmpExpanded && (
                        <div className="px-5 pb-5">
                            {/* Existing destinations */}
                            {rtmpDestinations.length > 0 && (
                                <div className="space-y-3 mb-4">
                                    {rtmpDestinations.map(dest => (
                                        <div key={dest.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${dest.is_active ? 'bg-background border-borderSubtle' : 'bg-background/50 border-borderSubtle opacity-60'
                                            }`}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-ink">{PLATFORM_LABELS[dest.platform] || dest.platform}</span>
                                                    {dest.label && <span className="text-xs text-inkLight">— {dest.label}</span>}
                                                </div>
                                                <p className="text-xs text-inkLight font-mono truncate">{dest.rtmp_url}</p>
                                                <p className="text-xs text-inkLight font-mono mt-0.5">Key: {dest.stream_key_masked}</p>
                                            </div>
                                            <button
                                                onClick={() => handleToggleRtmp(dest)}
                                                className="p-1.5 rounded-lg hover:bg-borderSubtle transition-colors"
                                                title={dest.is_active ? 'Disable' : 'Enable'}
                                            >
                                                {dest.is_active
                                                    ? <ToggleRight className="w-5 h-5 text-green-400" />
                                                    : <ToggleLeft className="w-5 h-5 text-inkLight" />
                                                }
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRtmp(dest.id)}
                                                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-400" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add new form */}
                            {!showRtmpForm ? (
                                <button
                                    onClick={() => setShowRtmpForm(true)}
                                    className="flex items-center gap-2 text-sm font-bold text-gold hover:text-gold/80 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Destination
                                </button>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="p-4 rounded-xl bg-background border border-borderSubtle space-y-4"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-inkLight uppercase tracking-wide block mb-1.5">Platform</label>
                                            <select
                                                value={newRtmp.platform}
                                                onChange={(e) => {
                                                    const p = e.target.value;
                                                    setNewRtmp(prev => ({ ...prev, platform: p, rtmp_url: DEFAULT_RTMP_URLS[p] || '' }));
                                                }}
                                                className="w-full bg-transparent border border-inkLight/30 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-gold/50 focus:outline-none"
                                            >
                                                {Object.entries(PLATFORM_LABELS).map(([val, label]) => (
                                                    <option key={val} value={val}>{label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-inkLight uppercase tracking-wide block mb-1.5">Label (optional)</label>
                                            <input
                                                type="text"
                                                value={newRtmp.label}
                                                onChange={(e) => setNewRtmp(prev => ({ ...prev, label: e.target.value }))}
                                                placeholder="My YouTube Channel"
                                                className="w-full bg-transparent border border-inkLight/30 rounded-xl px-3 py-2.5 text-sm text-ink placeholder:text-inkLight/50 focus:border-gold/50 focus:outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-inkLight uppercase tracking-wide block mb-1.5">RTMP URL</label>
                                        <input
                                            type="text"
                                            value={newRtmp.rtmp_url}
                                            onChange={(e) => setNewRtmp(prev => ({ ...prev, rtmp_url: e.target.value }))}
                                            placeholder="rtmp://..."
                                            className="w-full bg-transparent border border-inkLight/30 rounded-xl px-3 py-2.5 text-sm text-ink font-mono placeholder:text-inkLight/50 focus:border-gold/50 focus:outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-inkLight uppercase tracking-wide block mb-1.5">Stream Key</label>
                                        <div className="relative">
                                            <input
                                                type={showStreamKey ? 'text' : 'password'}
                                                value={newRtmp.stream_key}
                                                onChange={(e) => setNewRtmp(prev => ({ ...prev, stream_key: e.target.value }))}
                                                placeholder="Enter your stream key"
                                                className="w-full bg-transparent border border-inkLight/30 rounded-xl px-3 py-2.5 pr-10 text-sm text-ink font-mono placeholder:text-inkLight/50 focus:border-gold/50 focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowStreamKey(!showStreamKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-inkLight hover:text-ink transition-colors"
                                            >
                                                {showStreamKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleSaveRtmp}
                                            disabled={savingRtmp || !newRtmp.stream_key}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {savingRtmp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Save
                                        </button>
                                        <button
                                            onClick={() => { setShowRtmpForm(false); setShowStreamKey(false); }}
                                            className="px-4 py-2 rounded-xl border border-borderSubtle text-inkLight font-bold text-sm hover:bg-borderSubtle transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>

                {/* Broadcast Schedule */}
                <div className="mt-6 rounded-2xl bg-surface border border-borderSubtle overflow-hidden">
                    <button
                        onClick={() => setScheduleExpanded(!scheduleExpanded)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-borderSubtle/30 transition-colors"
                    >
                        <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                            <Calendar className="w-4 h-4 inline mr-2 text-gold" />
                            Broadcast Schedule
                            {schedule.broadcast_time && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 font-bold">
                                    {schedule.broadcast_time.substring(0, 5)} {schedule.broadcast_timezone}
                                </span>
                            )}
                        </h3>
                        {scheduleExpanded ? <ChevronUp className="w-4 h-4 text-inkLight" /> : <ChevronDown className="w-4 h-4 text-inkLight" />}
                    </button>

                    {scheduleExpanded && (
                        <div className="px-5 pb-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Time */}
                                <div>
                                    <label className="text-xs font-bold text-inkLight uppercase tracking-wide block mb-1.5">
                                        <Clock className="w-3.5 h-3.5 inline mr-1" /> Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        className="w-full bg-transparent border border-inkLight/30 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-gold/50 focus:outline-none"
                                    />
                                </div>

                                {/* Timezone */}
                                <div>
                                    <label className="text-xs font-bold text-inkLight uppercase tracking-wide block mb-1.5">Timezone</label>
                                    <select
                                        value={editTimezone}
                                        onChange={(e) => setEditTimezone(e.target.value)}
                                        className="w-full bg-transparent border border-inkLight/30 rounded-xl px-3 py-2.5 text-sm text-ink focus:border-gold/50 focus:outline-none"
                                    >
                                        {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Africa/Lagos', 'Africa/Johannesburg'].map(tz => (
                                            <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Save button */}
                                <div className="flex items-end">
                                    <button
                                        onClick={handleSaveSchedule}
                                        disabled={savingSchedule}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold text-background font-bold text-sm hover:bg-gold/90 disabled:opacity-50 transition-colors"
                                    >
                                        {savingSchedule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Save Schedule
                                    </button>
                                </div>
                            </div>

                            {/* Day selector */}
                            <div>
                                <label className="text-xs font-bold text-inkLight uppercase tracking-wide block mb-2">Broadcast Days</label>
                                <div className="flex gap-2">
                                    {DAY_LABELS.map((label, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => toggleDay(idx)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${editDays.includes(idx)
                                                ? 'bg-gold text-background shadow-lg shadow-gold/20'
                                                : 'bg-background border border-borderSubtle text-inkLight hover:border-gold/30'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Subscription */}
                <div className="mt-6 rounded-2xl bg-surface border border-borderSubtle overflow-hidden">
                    <button
                        onClick={() => setSubExpanded(!subExpanded)}
                        className="w-full px-5 py-4 flex items-center justify-between hover:bg-borderSubtle/30 transition-colors"
                    >
                        <h3 className="text-sm font-bold text-ink uppercase tracking-wide">
                            <Crown className="w-4 h-4 inline mr-2 text-gold" />
                            Subscription
                            {subscription && (
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-bold ${subscription.is_active
                                    ? 'bg-green-400/10 text-green-400'
                                    : 'bg-red-400/10 text-red-400'
                                    }`}>
                                    {subscription.plan_display}
                                </span>
                            )}
                        </h3>
                        {subExpanded ? <ChevronUp className="w-4 h-4 text-inkLight" /> : <ChevronDown className="w-4 h-4 text-inkLight" />}
                    </button>

                    {subExpanded && subscription && (
                        <div className="px-5 pb-5">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {Object.entries(PLAN_LIMITS).map(([key, plan]) => (
                                    <div
                                        key={key}
                                        className={`p-4 rounded-xl border transition-colors ${subscription.plan === key
                                            ? 'bg-gold/10 border-gold/30'
                                            : 'bg-background border-borderSubtle'
                                            }`}
                                    >
                                        <h4 className={`text-sm font-black mb-2 ${subscription.plan === key ? 'text-gold' : 'text-ink'
                                            }`}>
                                            {plan.label}
                                            {subscription.plan === key && (
                                                <span className="ml-2 text-xs px-1.5 py-0.5 bg-gold text-background rounded-md">Current</span>
                                            )}
                                        </h4>
                                        <ul className="space-y-1 text-xs text-inkLight">
                                            <li>• {plan.rtmp_destinations} RTMP destination{plan.rtmp_destinations > 1 ? 's' : ''}</li>
                                            <li>• {plan.playlists === -1 ? 'Unlimited' : plan.playlists} playlists</li>
                                        </ul>
                                    </div>
                                ))}
                            </div>

                            {subscription.plan !== 'free' && (
                                <div className="mt-4 p-3 rounded-xl bg-background border border-borderSubtle">
                                    <div className="grid grid-cols-2 gap-4 text-xs">
                                        <div>
                                            <span className="text-inkLight">Status:</span>
                                            <span className={`ml-2 font-bold ${subscription.is_active ? 'text-green-400' : 'text-red-400'
                                                }`}>
                                                {subscription.status}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-inkLight">Expires:</span>
                                            <span className="ml-2 text-ink font-bold">
                                                {subscription.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'Never'}
                                            </span>
                                        </div>
                                        {subscription.stx_address && (
                                            <div className="col-span-2">
                                                <span className="text-inkLight">STX Address:</span>
                                                <span className="ml-2 text-ink font-mono text-xs">{subscription.stx_address}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
