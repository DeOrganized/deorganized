import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Send, User, Loader2, ArrowLeft,
    Lock, Sparkles, MoreHorizontal, CheckCheck, Check, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    fetchThreads, fetchMessages, sendMessage,
    respondToCoHostInvite, fetchMyCoHostInvites, markThreadRead,
    Thread, Message, getImageUrl
} from '../lib/api';
import { useAuth } from '../lib/AuthContext';

interface MessagingInboxProps {
    isCreatorView?: boolean;
    /** Height constraint — defaults to h-[600px] (dashboard embed). Set to 'full' for standalone page. */
    heightClass?: string;
}

const CO_HOST_INVITE_REGEX = /inviting you to be a co-host/i;

export const MessagingInbox: React.FC<MessagingInboxProps> = ({
    isCreatorView = false,
    heightClass = 'h-[600px]',
}) => {
    const { accessToken, backendUser } = useAuth();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [activeThread, setActiveThread] = useState<Thread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [respondingInvite, setRespondingInvite] = useState<number | null>(null);
    // Persisted across reloads in localStorage — keyed per user
    const [respondedMessages, setRespondedMessages] = useState<Set<number>>(() => {
        try {
            const key = `responded_invites_${backendUser?.id ?? 'anon'}`;
            const stored = localStorage.getItem(key);
            return stored ? new Set<number>(JSON.parse(stored)) : new Set<number>();
        } catch { return new Set<number>(); }
    });
    // Invite IDs (not message IDs) that are no longer pending — hide buttons for these
    const [nonPendingInviteIds, setNonPendingInviteIds] = useState<Set<number>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);

    // Persist respondedMessages to localStorage whenever it changes
    useEffect(() => {
        if (!backendUser?.id) return;
        const key = `responded_invites_${backendUser.id}`;
        localStorage.setItem(key, JSON.stringify([...respondedMessages]));
    }, [respondedMessages, backendUser?.id]);

    useEffect(() => {
        if (!accessToken) return;
        setIsLoadingThreads(true);
        fetchThreads(accessToken)
            .then(setThreads)
            .catch(() => {})
            .finally(() => setIsLoadingThreads(false));
    }, [accessToken]);

    useEffect(() => {
        if (!activeThread || !accessToken) return;
        setIsLoadingMessages(true);
        // Load messages and mark them read in parallel
        Promise.all([
            fetchMessages(activeThread.id, accessToken),
            markThreadRead(activeThread.id, accessToken).catch(() => {}),
        ])
            .then(([msgs]) => {
                setMessages(msgs);
                // Clear unread badge on the thread in local state
                setThreads(prev => prev.map(t =>
                    t.id === activeThread.id ? { ...t, unread_count: 0 } : t
                ));
            })
            .catch(() => {})
            .finally(() => setIsLoadingMessages(false));

        // Fetch all co-host invites so we can check which are no longer pending
        fetchMyCoHostInvites(accessToken)
            .then(invites => {
                const nonPending = new Set<number>(
                    invites.filter(i => i.status !== 'pending').map(i => i.id)
                );
                setNonPendingInviteIds(nonPending);
            })
            .catch(() => {});
    }, [activeThread, accessToken]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeThread || !newMessage.trim() || !accessToken || isSending) return;
        try {
            setIsSending(true);
            const msg = await sendMessage(activeThread.id, newMessage.trim(), accessToken);
            setMessages(prev => [...prev, msg]);
            setNewMessage('');
            setThreads(prev => prev.map(t =>
                t.id === activeThread.id
                    ? { ...t, last_message: { id: msg.id, sender: { id: msg.sender.id, username: msg.sender.username }, body: msg.body, sent_at: msg.sent_at } }
                    : t
            ));
        } finally {
            setIsSending(false);
        }
    };

    const handleInviteResponse = async (msg: Message, action: 'accept' | 'decline') => {
        if (!accessToken) return;
        setRespondingInvite(msg.id);
        try {
            let inviteId = msg.cohost_invite_id;
            if (!inviteId) {
                // Fallback for old messages: search pending co-host invites
                const invites = await fetchMyCoHostInvites(accessToken);
                const pending = invites.find(inv => inv.status === 'pending');
                inviteId = pending?.id;
            }
            if (!inviteId) throw new Error('No matching invite found');
            await respondToCoHostInvite(inviteId, action, accessToken);
            // Hide buttons immediately and persist across reloads
            setRespondedMessages(prev => new Set(prev).add(msg.id));
            // Also mark this invite as non-pending so hide is driven by invite status too
            if (inviteId) setNonPendingInviteIds(prev => new Set(prev).add(inviteId));
            if (activeThread) {
                const updated = await fetchMessages(activeThread.id, accessToken);
                setMessages(updated);
            }
            const updatedThreads = await fetchThreads(accessToken);
            setThreads(updatedThreads);
        } catch (e) {
            console.error('Failed to respond to invite:', e);
        } finally {
            setRespondingInvite(null);
        }
    };

    const getOtherParticipant = (thread: Thread) =>
        thread.participants.find(p => p.id !== backendUser?.id) || thread.participants[0];

    const isCoHostInviteMsg = (msg: Message) =>
        CO_HOST_INVITE_REGEX.test(msg.body);

    if (isLoadingThreads && threads.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${heightClass} bg-canvas border border-borderSubtle rounded-3xl overflow-hidden shadow-soft`}>
            <div className="flex flex-1 overflow-hidden">
                {/* Threads Sidebar */}
                <div className={`w-full md:w-80 flex-shrink-0 border-r border-borderSubtle flex flex-col ${activeThread ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-borderSubtle">
                        <h3 className="text-base font-bold text-ink">Messages</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {threads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <MessageSquare className="w-12 h-12 text-inkLight opacity-20 mb-4" />
                                <p className="text-sm text-inkLight font-medium">No conversations yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-borderSubtle/50">
                                {threads.map(thread => {
                                    const other = getOtherParticipant(thread);
                                    const isActive = activeThread?.id === thread.id;
                                    return (
                                        <button
                                            key={thread.id}
                                            onClick={() => setActiveThread(thread)}
                                            className={`w-full flex items-center gap-3 p-4 hover:bg-surface transition-all text-left relative ${isActive ? 'bg-surface border-l-4 border-l-gold' : 'border-l-4 border-l-transparent'}`}
                                        >
                                            <div className="relative flex-shrink-0">
                                                <div className="w-12 h-12 rounded-full border border-borderSubtle overflow-hidden bg-surface">
                                                    {other?.profile_picture ? (
                                                        <img src={getImageUrl(other.profile_picture) || ''} alt={other.username} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                                            <User className="w-6 h-6 text-gold" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-canvas" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <h4 className="text-sm font-bold text-ink truncate">{other?.username}</h4>
                                                    <span className="text-[10px] text-inkLight whitespace-nowrap">
                                                        {thread.last_message ? new Date(thread.last_message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center gap-2">
                                                    <p className={`text-xs truncate ${thread.unread_count > 0 ? 'text-ink font-bold' : 'text-inkLight'}`}>
                                                        {thread.last_message?.body || 'No messages yet'}
                                                    </p>
                                                    {thread.unread_count > 0 && (
                                                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-gold text-[10px] text-white flex items-center justify-center font-black">
                                                            {thread.unread_count}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {thread.is_paygated && (
                                                <Lock className="w-3 h-3 text-gold opacity-50 absolute top-4 right-1" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className={`flex-1 flex flex-col min-w-0 bg-canvas/50 ${!activeThread ? 'hidden md:flex' : 'flex'}`}>
                    {activeThread ? (
                        <>
                            {/* Chat Header */}
                            <div className="px-6 py-4 border-b border-borderSubtle bg-canvas flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setActiveThread(null)} className="md:hidden p-2 -ml-2 text-inkLight hover:text-ink transition-colors">
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border border-borderSubtle overflow-hidden bg-surface">
                                            {getOtherParticipant(activeThread)?.profile_picture ? (
                                                <img src={getImageUrl(getOtherParticipant(activeThread).profile_picture) || ''} alt={getOtherParticipant(activeThread).username} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                                    <User className="w-5 h-5 text-gold" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-ink">{getOtherParticipant(activeThread)?.username}</h4>
                                            <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button className="p-2 text-inkLight hover:text-ink transition-colors rounded-lg hover:bg-surface border border-transparent hover:border-borderSubtle">
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {isLoadingMessages ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3">
                                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                                        <p className="text-xs text-inkLight font-medium">Loading messages…</p>
                                    </div>
                                ) : (
                                    <>
                                        {messages.map(msg => {
                                            const isMe = msg.sender.id === backendUser?.id;
                                            const isInvite = isCoHostInviteMsg(msg);
                                            // Hide buttons if already responded (localStorage) OR invite no longer pending (server)
                                            const inviteAlreadyHandled = respondedMessages.has(msg.id)
                                                || (msg.cohost_invite_id != null && nonPendingInviteIds.has(msg.cohost_invite_id));
                                            const isResponding = respondingInvite === msg.id;

                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`flex gap-3 max-w-[82%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                        {!isMe && (
                                                            <div className="w-8 h-8 rounded-full border border-borderSubtle overflow-hidden bg-surface flex-shrink-0 mt-auto">
                                                                {msg.sender.profile_picture ? (
                                                                    <img src={getImageUrl(msg.sender.profile_picture) || ''} alt={msg.sender.username} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                                                        <User className="w-4 h-4 text-gold" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex flex-col gap-1">
                                                            {/* Message bubble */}
                                                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe
                                                                ? 'bg-gold text-white rounded-tr-none'
                                                                : isInvite
                                                                    ? 'bg-surface border-2 border-gold/30 text-ink rounded-tl-none'
                                                                    : 'bg-surface border border-borderSubtle text-ink rounded-tl-none'
                                                            }`}>
                                                                {msg.body}
                                                            </div>

                                                            {/* Accept / Decline buttons — shown for any invite message received by me */}
                                                            {isInvite && !isMe && !inviteAlreadyHandled && (
                                                                <AnimatePresence>
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 4 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="flex gap-2 mt-1"
                                                                    >
                                                                        <button
                                                                            disabled={isResponding}
                                                                            onClick={() => handleInviteResponse(msg, 'accept')}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-all disabled:opacity-50"
                                                                        >
                                                                            {isResponding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                                                            Accept
                                                                        </button>
                                                                        <button
                                                                            disabled={isResponding}
                                                                            onClick={() => handleInviteResponse(msg, 'decline')}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-red-300 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"
                                                                        >
                                                                            {isResponding ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                                                            Decline
                                                                        </button>
                                                                    </motion.div>
                                                                </AnimatePresence>
                                                            )}

                                                            <div className={`flex items-center gap-1.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                <span className="text-[10px] text-inkLight">
                                                                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                {isMe && <CheckCheck className="w-3 h-3 text-gold" />}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <div ref={messagesEndRef} />
                                    </>
                                )}
                            </div>

                            {/* Input */}
                            <div className="p-4 bg-canvas border-t border-borderSubtle">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-surface border border-borderSubtle rounded-2xl p-2 pl-4 shadow-inner">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        placeholder="Type a message…"
                                        className="flex-1 bg-transparent border-none py-2 text-sm focus:outline-none text-ink"
                                        disabled={isSending}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !newMessage.trim()}
                                        className="w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center shadow-md hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-20 h-20 rounded-3xl bg-gold/10 flex items-center justify-center mb-6 relative">
                                <MessageSquare className="w-10 h-10 text-gold" />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-canvas shadow-sm" />
                            </div>
                            <h3 className="text-xl font-bold text-ink mb-2">Your Conversations</h3>
                            <p className="text-sm text-inkLight max-w-[280px]">
                                Select a conversation from the list to view messages.
                            </p>
                            <div className="mt-8 flex items-center gap-3 p-4 rounded-2xl bg-gold/5 border border-gold/20">
                                <Lock className="w-5 h-5 text-gold shrink-0" />
                                <p className="text-xs text-inkLight text-left">Co-host invitations will appear here with Accept / Decline buttons.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
