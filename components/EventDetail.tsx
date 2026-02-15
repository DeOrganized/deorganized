import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, Clock, MapPin, Globe, Users, Heart, MessageSquare,
    Share2, ExternalLink, ArrowLeft, Loader2, Send, MoreHorizontal,
    Pencil, Trash2, X, Check, Video
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
    Event, Comment, fetchEventById,
    toggleLike, checkIfLiked, CONTENT_TYPES,
    fetchComments, createComment, deleteComment, updateComment,
    toggleFollow, checkIsFollowing
} from '../lib/api';

interface EventDetailProps {
    eventId: number;
    onNavigate: (page: string, id?: string | number) => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({ eventId, onNavigate }) => {
    const { backendUser, accessToken } = useAuth();

    const [event, setEvent] = useState<Event | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Interactions
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);

    // Comments
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [commentMenuId, setCommentMenuId] = useState<number | null>(null);
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

    // Share
    const [showSharePopup, setShowSharePopup] = useState(false);

    // Toast
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    const showToastMsg = (msg: string) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    // Load event
    const loadEvent = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await fetchEventById(eventId);
            setEvent(data);
            setLikeCount(data.like_count || 0);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => { loadEvent(); }, [loadEvent]);

    // Check like status
    useEffect(() => {
        const checkLike = async () => {
            if (!backendUser?.id || !event) return;
            try {
                const liked = await checkIfLiked(CONTENT_TYPES.EVENT, event.id, backendUser.id);
                setIsLiked(liked);
            } catch { }
        };
        checkLike();
    }, [backendUser?.id, event?.id]);

    // Check follow status
    useEffect(() => {
        const checkFollow = async () => {
            if (!backendUser?.id || !event || !accessToken) return;
            if (backendUser.id === event.organizer.id) return;
            try {
                const following = await checkIsFollowing(event.organizer.id, backendUser.id, accessToken);
                setIsFollowing(following);
            } catch { }
        };
        checkFollow();
    }, [backendUser?.id, event?.organizer?.id, accessToken]);

    // Load comments
    useEffect(() => {
        const loadComments = async () => {
            if (!event) return;
            try {
                const data = await fetchComments(CONTENT_TYPES.EVENT, event.id, true, accessToken || undefined);
                setComments(data);
            } catch { }
        };
        loadComments();
    }, [event?.id, accessToken]);

    const handleLike = async () => {
        if (!accessToken || !event) return;
        try {
            const result = await toggleLike(CONTENT_TYPES.EVENT, event.id, accessToken);
            setIsLiked(result.status === 'liked');
            setLikeCount(prev => result.status === 'liked' ? prev + 1 : prev - 1);
        } catch { showToastMsg('Failed to like event'); }
    };

    const handleFollow = async () => {
        if (!accessToken || !event) return;
        try {
            const result = await toggleFollow(event.organizer.id, accessToken);
            setIsFollowing(result.status === 'followed');
            showToastMsg(result.status === 'followed' ? 'Following!' : 'Unfollowed');
        } catch { showToastMsg('Failed to follow'); }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !event || !commentText.trim()) return;
        setIsSubmittingComment(true);
        try {
            await createComment(CONTENT_TYPES.EVENT, event.id, commentText, accessToken);

            // Re-fetch comments to get full data with user info
            const updatedComments = await fetchComments(CONTENT_TYPES.EVENT, event.id, true, accessToken);
            setComments(updatedComments);
            setCommentText('');
        } catch { showToastMsg('Failed to post comment'); }
        finally { setIsSubmittingComment(false); }
    };

    const handleDeleteComment = (commentId: number) => {
        setCommentToDelete(commentId);
    };

    const handleEditComment = async (commentId: number) => {
        if (!accessToken || !editText.trim()) return;
        try {
            await updateComment(commentId, editText, accessToken);

            // Re-fetch comments to get full updated data
            if (event) {
                const updatedComments = await fetchComments(CONTENT_TYPES.EVENT, event.id, true, accessToken);
                setComments(updatedComments);
            }
            setEditingCommentId(null);
            setEditText('');
        } catch { showToastMsg('Failed to edit comment'); }
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete || !accessToken) return;
        try {
            await deleteComment(commentToDelete, accessToken);
            setComments(prev => prev.filter(c => c.id !== commentToDelete));
            setCommentToDelete(null);
            showToastMsg('Comment deleted');
        } catch {
            showToastMsg('Failed to delete comment');
        }
    };

    const handleShare = () => {
        const url = window.location.origin;
        navigator.clipboard.writeText(`${url}/events/${eventId}`);
        setShowSharePopup(true);
        setTimeout(() => setShowSharePopup(false), 2000);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit'
        });
    };

    const timeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'upcoming': return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
            case 'ongoing': return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
            case 'past': return 'bg-gray-500/10 text-gray-500 border-gray-500/30';
            default: return 'bg-green-500/10 text-green-500 border-green-500/30';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    if (error || !event) {
        return (
            <div className="min-h-screen pt-24 pb-20 container max-w-[1024px] mx-auto px-6 text-center">
                <p className="text-inkLight">Event not found.</p>
                <button onClick={() => onNavigate('event-calendar')} className="mt-4 text-gold font-bold">
                    ← Back to Calendar
                </button>
            </div>
        );
    }

    const eventDate = event.start_datetime || event.start_date;
    const eventEndDate = event.end_datetime || event.end_date;

    return (
        <div className="min-h-screen pt-24 pb-20">
            {/* Toast Notification */}
            {showToast && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-4 right-4 bg-gold text-ink px-6 py-3 rounded-full shadow-lg font-semibold z-50"
                >
                    {toastMessage}
                </motion.div>
            )}

            {/* Delete Comment Confirmation Modal */}
            {commentToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-canvas rounded-3xl shadow-2xl max-w-md w-full p-8 border border-borderSubtle"
                    >
                        {/* Icon */}
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-ink text-center mb-2">
                            Delete Comment?
                        </h3>

                        {/* Message */}
                        <p className="text-inkSubtle text-center mb-6">
                            This action cannot be undone. Your comment will be permanently deleted.
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setCommentToDelete(null)}
                                className="flex-1 px-6 py-3 bg-surface text-ink font-semibold rounded-full hover:bg-borderSubtle transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteComment}
                                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-all shadow-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <div className="container max-w-[900px] mx-auto px-6 space-y-8">
                {/* Back Button */}
                <button
                    onClick={() => onNavigate('event-calendar')}
                    className="flex items-center gap-2 text-inkLight hover:text-ink transition-colors font-semibold"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Calendar
                </button>

                {/* Banner */}
                <div className="relative rounded-2xl overflow-hidden aspect-[21/9] bg-surface">
                    {(event.banner_image || event.thumbnail) ? (
                        <img
                            src={event.banner_image || event.thumbnail || ''}
                            alt={event.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gold/20 to-purple-500/20">
                            <Calendar className="w-16 h-16 text-gold/50" />
                        </div>
                    )}
                    {/* Status Badge */}
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(event.status)}`}>
                        {(event.status || 'upcoming').charAt(0).toUpperCase() + (event.status || 'upcoming').slice(1)}
                    </div>
                </div>

                {/* Event Info */}
                <div className="space-y-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-ink">{event.title}</h1>

                    {/* Meta Info Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date & Time */}
                        <div className="bg-surface border border-borderSubtle rounded-xl p-4 flex items-start gap-3">
                            <div className="bg-gold/10 p-2 rounded-lg">
                                <Calendar className="w-5 h-5 text-gold" />
                            </div>
                            <div>
                                {event.is_recurring ? (
                                    <>
                                        <p className="text-sm font-bold text-ink">
                                            {event.recurrence_type === 'DAILY' && 'Daily'}
                                            {event.recurrence_type === 'WEEKDAYS' && 'Weekdays'}
                                            {event.recurrence_type === 'WEEKENDS' && 'Weekends'}
                                            {event.recurrence_type === 'SPECIFIC_DAY' && ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][event.day_of_week || 0]}
                                            {event.scheduled_time && ` by ${event.scheduled_time}`}
                                        </p>
                                        <p className="text-xs text-inkLight">Recurring Event</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm font-bold text-ink">{eventDate ? formatDate(eventDate) : 'Date TBD'}</p>
                                        <p className="text-xs text-inkLight">
                                            {eventDate ? formatTime(eventDate) : ''}
                                            {eventEndDate ? ` — ${formatTime(eventEndDate)}` : ''}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Location */}
                        <div className="bg-surface border border-borderSubtle rounded-xl p-4 flex items-start gap-3">
                            <div className="bg-blue-500/10 p-2 rounded-lg">
                                {event.is_virtual ? <Video className="w-5 h-5 text-blue-500" /> : <MapPin className="w-5 h-5 text-blue-500" />}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-ink">
                                    {event.is_virtual ? 'Virtual Event' : (event.venue_name || event.location || 'Location TBD')}
                                </p>
                                <p className="text-xs text-inkLight">
                                    {event.is_virtual && event.meeting_link ? (
                                        <a href={event.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                            Join Meeting →
                                        </a>
                                    ) : event.address || ''}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Capacity & Registration */}
                    {(event.capacity || event.registration_link) && (
                        <div className="flex flex-wrap gap-3">
                            {event.capacity && (
                                <div className="flex items-center gap-1.5 text-sm text-inkLight">
                                    <Users className="w-4 h-4" />
                                    <span>{event.capacity} spots</span>
                                </div>
                            )}
                            {event.registration_link && (
                                <a
                                    href={event.registration_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-sm text-gold font-semibold hover:underline"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Register Now
                                </a>
                            )}
                        </div>
                    )}

                    {/* Organizer */}
                    <div className="flex items-center justify-between bg-surface border border-borderSubtle rounded-xl p-4">
                        <div
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => onNavigate('creator-detail', event.organizer.id)}
                        >
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-canvas border border-borderSubtle">
                                {event.organizer.profile_picture ? (
                                    <img src={event.organizer.profile_picture} alt={event.organizer.username} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gold font-bold">
                                        {event.organizer.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm font-bold text-ink">{event.organizer.username}</p>
                                <p className="text-xs text-inkLight">Organizer</p>
                            </div>
                        </div>

                        {backendUser && backendUser.id !== event.organizer.id && (
                            <button
                                onClick={handleFollow}
                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${isFollowing
                                    ? 'bg-surface border border-borderSubtle text-inkLight hover:border-red-300 hover:text-red-400'
                                    : 'bg-gold text-white hover:bg-gold/90'
                                    }`}
                            >
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                    </div>

                    {/* Description */}
                    <div className="prose prose-sm max-w-none">
                        <h3 className="text-lg font-bold text-ink mb-3">About This Event</h3>
                        <p className="text-inkLight leading-relaxed whitespace-pre-wrap">{event.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 border-t border-b border-borderSubtle py-3 sm:py-4">
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold transition-all text-sm sm:text-base ${isLiked
                                ? 'bg-red-50 text-red-500 border border-red-200'
                                : 'bg-surface text-inkLight border border-borderSubtle hover:bg-red-50 hover:text-red-500'
                                }`}
                        >
                            <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-red-500' : ''}`} />
                            {likeCount}
                        </button>

                        <button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-surface text-inkLight font-semibold border border-borderSubtle text-sm sm:text-base">
                            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                            {comments.length}
                        </button>

                        <div className="relative">
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-surface text-inkLight font-semibold border border-borderSubtle hover:bg-blue-50 hover:text-blue-500 transition-all text-sm sm:text-base"
                            >
                                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Share</span>
                            </button>
                            <AnimatePresence>
                                {showSharePopup && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute bottom-full left-0 mb-2 bg-ink text-canvas text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap"
                                    >
                                        Link copied! ✅
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-ink">Comments ({comments.length})</h3>

                        {/* Add Comment */}
                        {accessToken && (
                            <form onSubmit={handleComment} className="flex gap-3">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold transition-colors"
                                />
                                <button
                                    type="submit"
                                    disabled={isSubmittingComment || !commentText.trim()}
                                    className="bg-gold text-white px-4 py-3 rounded-xl font-bold hover:bg-gold/90 transition-all disabled:opacity-50"
                                >
                                    {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </button>
                            </form>
                        )}

                        {/* Comments List */}
                        <div className="space-y-4">
                            {comments.length === 0 ? (
                                <p className="text-center text-inkLight text-sm py-8">No comments yet. Be the first!</p>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3 group">
                                        <div
                                            className="w-8 h-8 rounded-full overflow-hidden bg-surface flex-shrink-0 cursor-pointer"
                                            onClick={() => onNavigate('creator-detail', comment.user.id)}
                                        >
                                            {comment.user.profile_picture ? (
                                                <img src={comment.user.profile_picture} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gold">
                                                    {comment.user.username.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-ink">{comment.user.username}</span>
                                                <span className="text-xs text-inkLight">{timeAgo(comment.created_at)}</span>

                                            </div>

                                            {editingCommentId === comment.id ? (
                                                <div className="mt-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        className="flex-1 bg-canvas border border-gold rounded-lg px-3 py-1.5 text-sm text-ink focus:outline-none"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={() => handleEditComment(comment.id)}
                                                        className="text-green-500 hover:text-green-600 p-1"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingCommentId(null); setEditText(''); }}
                                                        className="text-red-400 hover:text-red-500 p-1"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-inkLight mt-0.5">{comment.text}</p>
                                            )}
                                        </div>

                                        {/* Comment Actions */}
                                        {backendUser?.id === comment.user.id && editingCommentId !== comment.id && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setCommentMenuId(commentMenuId === comment.id ? null : comment.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-inkLight hover:text-ink transition-all"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                {commentMenuId === comment.id && (
                                                    <div className="absolute right-0 top-full mt-1 bg-surface border border-borderSubtle rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCommentId(comment.id);
                                                                setEditText(comment.text);
                                                                setCommentMenuId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-canvas transition-colors"
                                                        >
                                                            <Pencil className="w-3 h-3" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-3 h-3" /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
