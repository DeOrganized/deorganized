import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, CheckCircle, Bug, Lightbulb, MessageCircle } from 'lucide-react';
import { submitFeedback } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

export const FeedbackPopup: React.FC = () => {
    const { backendUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [category, setCategory] = useState<'bug' | 'feature' | 'general'>('general');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setIsSubmitting(true);
        setShowError(false);
        try {
            await submitFeedback(category, message, backendUser?.email || backendUser?.username);
            setShowSuccess(true);
            setMessage('');
            setTimeout(() => {
                setShowSuccess(false);
                setIsOpen(false);
            }, 2000);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.');
            setShowError(true);
            setTimeout(() => setShowError(false), 4000);
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = [
        { id: 'bug' as const, label: 'Bug Report', icon: Bug, color: 'text-red-400' },
        { id: 'feature' as const, label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-400' },
        { id: 'general' as const, label: 'General', icon: MessageCircle, color: 'text-blue-400' },
    ];

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-50 bg-gold text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title="Give Feedback"
            >
                <MessageSquarePlus className="w-6 h-6" />
            </motion.button>

            {/* Popup Modal */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />

                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-surface border border-borderSubtle rounded-2xl shadow-2xl overflow-hidden"
                        >
                            {showSuccess ? (
                                <div className="p-8 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', bounce: 0.5 }}
                                    >
                                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                    </motion.div>
                                    <h3 className="text-lg font-bold text-ink">Thank You! 🎉</h3>
                                    <p className="text-sm text-inkLight mt-2">Your feedback has been received.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4 border-b border-borderSubtle">
                                        <h3 className="text-lg font-bold text-ink">Give Feedback</h3>
                                        <button
                                            type="button"
                                            onClick={() => setIsOpen(false)}
                                            className="p-1.5 rounded-lg hover:bg-canvas transition-colors text-inkLight"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="p-4 space-y-4">
                                        {/* Category Selection */}
                                        <div>
                                            <label className="text-xs font-bold text-inkLight uppercase tracking-wider mb-2 block">
                                                Category
                                            </label>
                                            <div className="flex gap-2">
                                                {categories.map((cat) => (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => setCategory(cat.id)}
                                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${category === cat.id
                                                            ? 'bg-gold/10 border-gold text-gold'
                                                            : 'bg-canvas border-borderSubtle text-inkLight hover:border-gold/50'
                                                            }`}
                                                    >
                                                        <cat.icon className={`w-3.5 h-3.5 ${category === cat.id ? 'text-gold' : cat.color}`} />
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="text-xs font-bold text-inkLight uppercase tracking-wider mb-2 block">
                                                Your Feedback
                                            </label>
                                            <textarea
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="Tell us what's on your mind..."
                                                rows={4}
                                                className="w-full bg-canvas border border-borderSubtle rounded-xl px-4 py-3 text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold transition-colors resize-none"
                                                required
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !message.trim()}
                                            className="w-full bg-gold text-white font-bold py-3 rounded-xl hover:bg-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Send className="w-4 h-4" />
                                                    Submit Feedback
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Error Toast */}
            <AnimatePresence>
                {showError && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed top-20 right-6 z-50 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg max-w-sm"
                    >
                        <p className="font-semibold text-sm">{errorMessage}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

