import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare, Send, User, Loader2, ArrowLeft,
    Lock, Sparkles, CreditCard, ChevronRight, Search,
    MoreHorizontal, Check, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    fetchThreads, fetchMessages, sendMessage,
    Thread, Message, getImageUrl
} from '../lib/api';
import { useAuth } from '../lib/AuthContext';

interface MessagingInboxProps {
    isCreatorView?: boolean;
}

export const MessagingInbox: React.FC<MessagingInboxProps> = ({ isCreatorView = false }) => {
    const { accessToken, backendUser } = useAuth();
    const [threads, setThreads] = useState<Thread[]>([]);
    const [activeThread, setActiveThread] = useState<Thread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');

    // Loading states
    const [isLoadingThreads, setIsLoadingThreads] = useState(true);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load threads
    useEffect(() => {
        const loadThreads = async () => {
            if (!accessToken) return;
            try {
                setIsLoadingThreads(true);
                const data = await fetchThreads(accessToken);
                setThreads(data);
            } catch (error) {
                console.error('Failed to load threads:', error);
            } finally {
                setIsLoadingThreads(false);
            }
        };
        loadThreads();
    }, [accessToken]);

    // Load messages when thread changes
    useEffect(() => {
        const loadMessages = async () => {
            if (!activeThread || !accessToken) return;
            try {
                setIsLoadingMessages(true);
                const data = await fetchMessages(activeThread.id, accessToken);
                setMessages(data);
            } catch (error) {
                console.error('Failed to load messages:', error);
            } finally {
                setIsLoadingMessages(false);
            }
        };
        loadMessages();
    }, [activeThread, accessToken]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeThread || !newMessage.trim() || !accessToken || isSending) return;

        try {
            setIsSending(true);
            const msg = await sendMessage(activeThread.id, newMessage.trim(), accessToken);
            setMessages([...messages, msg]);
            setNewMessage('');

            // Update threads list with last message
            setThreads(threads.map(t =>
                t.id === activeThread.id ? { ...t, last_message: msg } : t
            ));
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const getOtherParticipant = (thread: Thread) => {
        return thread.participants.find(p => p.id !== backendUser?.id) || thread.participants[0];
    };

    if (isLoadingThreads && threads.length === 0) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[600px] bg-canvas border border-borderSubtle rounded-3xl overflow-hidden shadow-soft">
            <div className="flex flex-1 overflow-hidden">
                {/* Threads Sidebar */}
                <div className={`w-full md:w-80 flex-shrink-0 border-r border-borderSubtle flex flex-col ${activeThread ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-borderSubtle">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight" />
                            <input
                                type="text"
                                placeholder="Search messages..."
                                className="w-full bg-surface border border-borderSubtle rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-gold transition-colors"
                            />
                        </div>
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
                                                    {other.profile_picture ? (
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
                                                    <h4 className="text-sm font-bold text-ink truncate">{other.username}</h4>
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
                                    <button
                                        onClick={() => setActiveThread(null)}
                                        className="md:hidden p-2 -ml-2 text-inkLight hover:text-ink transition-colors"
                                    >
                                        <ArrowLeft className="w-5 h-5" />
                                    </button>

                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border border-borderSubtle overflow-hidden bg-surface">
                                            {getOtherParticipant(activeThread).profile_picture ? (
                                                <img
                                                    src={getImageUrl(getOtherParticipant(activeThread).profile_picture) || ''}
                                                    alt={getOtherParticipant(activeThread).username}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                                    <User className="w-5 h-5 text-gold" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-ink">{getOtherParticipant(activeThread).username}</h4>
                                            <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Online
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button className="p-2 text-inkLight hover:text-gold transition-colors rounded-lg hover:bg-surface border border-transparent hover:border-borderSubtle">
                                        <Sparkles className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-inkLight hover:text-ink transition-colors rounded-lg hover:bg-surface border border-transparent hover:border-borderSubtle">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {isLoadingMessages ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3">
                                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                                        <p className="text-xs text-inkLight font-medium">Decrypting messages...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex flex-col items-center mb-8">
                                            <div className="w-16 h-16 rounded-full border-2 border-borderSubtle overflow-hidden bg-surface mb-3">
                                                {getOtherParticipant(activeThread).profile_picture ? (
                                                    <img
                                                        src={getImageUrl(getOtherParticipant(activeThread).profile_picture) || ''}
                                                        alt={getOtherParticipant(activeThread).username}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                                        <User className="w-8 h-8 text-gold" />
                                                    </div>
                                                )}
                                            </div>
                                            <h3 className="text-lg font-bold text-ink">{getOtherParticipant(activeThread).username}</h3>
                                            <p className="text-xs text-inkLight mt-1 text-center max-w-[240px]">
                                                This is the beginning of your conversation with {getOtherParticipant(activeThread).username}.
                                            </p>
                                            {activeThread.is_paygated && (
                                                <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-full text-[10px] font-bold text-gold">
                                                    <Lock className="w-3 h-3" /> Premium Thread Unlocked
                                                </div>
                                            )}
                                        </div>

                                        {messages.map((msg, idx) => {
                                            const isMe = msg.sender.id === backendUser?.id;

                                            return (
                                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`flex gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
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
                                                            <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe
                                                                ? 'bg-gold text-white rounded-tr-none'
                                                                : 'bg-surface border border-borderSubtle text-ink rounded-tl-none'
                                                                }`}>
                                                                {msg.body}
                                                            </div>
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

                            {/* Chat Input */}
                            <div className="p-4 bg-canvas border-t border-borderSubtle">
                                <form
                                    onSubmit={handleSendMessage}
                                    className="flex items-center gap-2 bg-surface border border-borderSubtle rounded-2xl p-2 pl-4 shadow-inner"
                                >
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none py-2 text-sm focus:outline-none text-ink"
                                        disabled={isSending}
                                    />
                                    <div className="flex items-center gap-1 pr-1">

                                        <button
                                            type="submit"
                                            disabled={isSending || !newMessage.trim()}
                                            className="w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center shadow-md hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                        </button>
                                    </div>
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
                                Select a conversation from the list to view messages or start a new encrypted thread.
                            </p>

                            <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                                <div className="p-4 rounded-2xl bg-surface border border-borderSubtle flex flex-col items-center shadow-sm">
                                    <Lock className="w-5 h-5 text-gold mb-2" />
                                    <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Secure</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-surface border border-borderSubtle flex flex-col items-center shadow-sm">
                                    <Sparkles className="w-5 h-5 text-gold mb-2" />
                                    <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Encrypted</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
