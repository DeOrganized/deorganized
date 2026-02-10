import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share2, Play, Calendar, Clock, User, Bell, UserPlus, UserCheck, ExternalLink, Hash } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { requireAuth } from '../lib/walletHelpers';
import {
    API_BASE_URL,
    fetchShowById,
    fetchComments,
    toggleLike,
    checkIfLiked,
    createComment,
    deleteComment,
    toggleFollow,
    checkIsFollowing,
    trackShare,
    deleteShow,
    CONTENT_TYPES,
    Show,
    Comment
} from '../lib/api';

interface ShowDetailProps {
    onNavigate?: (page: string, id?: string | number) => void;
    showId: string; // Now accepts slug instead of numeric ID
}

export const ShowDetail: React.FC<ShowDetailProps> = ({ onNavigate, showId }) => {
    const [show, setShow] = useState<Show | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [showSharePopup, setShowSharePopup] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);

    // Get auth from AuthContext
    const { isBackendAuthenticated, backendUser, accessToken, connectWallet } = useAuth();
    const isAuthenticated = isBackendAuthenticated;
    const userData = backendUser;

    useEffect(() => {
        loadShowData();
    }, [showId]);

    const loadShowData = async () => {
        try {
            setLoading(true);

            // Fetch show details
            const showData = await fetchShowById(showId);
            setShow(showData);
            setLikeCount(showData.like_count);

            // Fetch comments using numeric ID, not slug
            const commentsData = await fetchComments(CONTENT_TYPES.SHOW, showData.id, true, accessToken || undefined);
            setComments(commentsData);

            // Check if user has liked (if authenticated)
            if (isAuthenticated && userData) {
                const liked = await checkIfLiked(CONTENT_TYPES.SHOW, showData.id, userData.id);
                setIsLiked(liked);

                // Check if user is following the creator
                if (showData.creator.id !== userData.id) {
                    const following = await checkIsFollowing(
                        showData.creator.id,
                        userData.id,
                        accessToken!
                    );
                    setIsFollowing(following);
                }
            }
        } catch (error) {
            console.error('Failed to load show data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLikeToggle = async () => {
        if (!isAuthenticated) {
            // Trigger wallet connection instead of showing alert
            connectWallet();
            return;
        }

        try {
            // Optimistic update
            const wasLiked = isLiked;
            setIsLiked(!wasLiked);
            setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

            const result = await toggleLike(CONTENT_TYPES.SHOW, show!.id, accessToken!);

            // Verify with server data
            const updatedShow = await fetchShowById(showId);

            setIsLiked(result.status === 'liked');
            setLikeCount(updatedShow.like_count);

            // Also update the show object if needed
            if (show) {
                setShow({ ...show, like_count: updatedShow.like_count });
            }
        } catch (error) {
            console.error('Failed to toggle like:', error);
            // Revert optimistic update on error
            setIsLiked(isLiked);
            setLikeCount(show?.like_count || 0);
            alert('Failed to update like status');
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isAuthenticated) {
            // Trigger wallet connection instead of showing alert
            connectWallet();
            return;
        }

        if (!commentText.trim()) return;

        try {
            setSubmittingComment(true);
            await createComment(
                CONTENT_TYPES.SHOW,
                show!.id,
                commentText,
                accessToken!
            );

            // Re-fetch comments to get full data with user info
            const updatedComments = await fetchComments(CONTENT_TYPES.SHOW, show!.id, true, accessToken);
            setComments(updatedComments);
            setCommentText('');
        } catch (error) {
            console.error('Failed to add comment:', error);
            alert('Failed to post comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: number) => {
        setCommentToDelete(commentId);
    };

    const confirmDeleteComment = async () => {
        if (!commentToDelete) return;

        try {
            await deleteComment(commentToDelete, accessToken!);
            setComments(prev => prev.filter(c => c.id !== commentToDelete));
            setCommentToDelete(null);
        } catch (error) {
            console.error('Failed to delete comment:', error);
            alert('Failed to delete comment');
        }
    };

    const handleShare = async () => {
        if (!show) return;

        // Generate the proper URL with slug
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/shows/${show.slug}`;

        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl);

        // Track the share
        try {
            await trackShare(show.slug);
        } catch (error) {
            console.error('Failed to track share:', error);
        }

        // Show confirmation popup
        setShowSharePopup(true);
        setTimeout(() => setShowSharePopup(false), 2000);
    };

    const handleWatchNow = () => {
        if (show?.external_link) {
            window.open(show.external_link, '_blank', 'noopener,noreferrer');
        }
    };

    const getPlatformLabel = (platform?: string) => {
        switch (platform) {
            case 'youtube': return 'Watch on YouTube';
            case 'twitch': return 'Watch on Twitch';
            case 'twitter': return 'Watch on X';
            case 'rumble': return 'Watch on Rumble';
            case 'kick': return 'Watch on Kick';
            default: return 'Watch Now';
        }
    };

    const handleDeleteShow = async () => {
        if (!isAuthenticated || !accessToken) {
            return;
        }

        if (!show || show.creator.id !== userData?.id) {
            return;
        }

        try {
            await deleteShow(show.slug, accessToken);
            setShowDeleteModal(false);
            onNavigate?.('shows');
        } catch (error) {
            console.error('Failed to delete show:', error);
            alert('Failed to delete show. Please try again.');
            setShowDeleteModal(false);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <p className="text-inkLight">Loading show...</p>
            </div>
        );
    }

    if (!show) {
        return (
            <div className="min-h-screen pt-24 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-ink mb-2">Show not found</h2>
                    <button
                        onClick={() => onNavigate?.('shows')}
                        className="text-gold hover:underline"
                    >
                        ← Back to shows
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20 bg-canvas">
            {/* Back Button */}
            <div className="container max-w-[1280px] mx-auto px-6 mb-6">
                <button
                    onClick={() => onNavigate?.('shows')}
                    className="flex items-center gap-2 text-inkLight hover:text-ink transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back to Shows
                </button>
            </div>

            {/* Hero Section */}
            <div className="container max-w-[1280px] mx-auto px-6 mb-12">
                <div className="relative rounded-3xl overflow-hidden bg-canvas border border-borderSubtle shadow-soft">
                    {/* Background Image */}
                    <div className="absolute inset-0 opacity-20">
                        <img
                            src={show.thumbnail || "https://picsum.photos/1600/900?grayscale"}
                            alt={show.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
                    </div>

                    <div className="relative z-10 grid lg:grid-cols-2 gap-8 p-8 md:p-12">
                        {/* Left: Info */}
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="bg-gold-50 text-gold border border-gold-100 px-3 py-1 rounded-full text-xs font-bold uppercase">
                                    {show.status}
                                </span>
                                {show.is_recurring && (
                                    <span className="flex items-center gap-1.5 bg-surface text-ink px-3 py-1 rounded-full text-xs font-semibold">
                                        <Calendar className="w-3 h-3" />
                                        Recurring
                                    </span>
                                )}
                                {/* Display Tags */}
                                {show.tags && show.tags.map(tag => (
                                    <span key={tag.id} className="flex items-center gap-1 bg-surface text-inkLight border border-borderSubtle px-3 py-1 rounded-full text-xs font-medium">
                                        <Hash className="w-3 h-3 text-gold" />
                                        {tag.name}
                                    </span>
                                ))}
                            </div>

                            <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight">
                                {show.title}
                            </h1>

                            <p className="text-lg text-inkLight font-medium">
                                {show.description}
                            </p>

                            {/* Creator Info */}
                            <div className="flex items-center justify-between gap-4 pt-4 border-t border-borderSubtle">
                                <div className="flex items-center gap-4">
                                    <img
                                        src={show.creator.profile_picture || "https://picsum.photos/100/100"}
                                        alt={show.creator.username}
                                        className="w-12 h-12 rounded-full border-2 border-borderSubtle shadow-sm"
                                    />
                                    <div>
                                        <p className="text-sm text-inkLight">Hosted by</p>
                                        <p className="font-bold text-ink flex items-center gap-2">
                                            {show.creator.username}
                                            {show.creator.is_verified && (
                                                <span className="text-blue-500">✓</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Follow Button */}
                                {isAuthenticated && userData?.id !== show.creator.id && (
                                    <button
                                        onClick={async () => {
                                            if (!accessToken) return;
                                            try {
                                                const result = await toggleFollow(show.creator.id, accessToken);
                                                setIsFollowing(result.status === 'followed');
                                            } catch (error) {
                                                console.error('Failed to toggle follow:', error);
                                                alert('Failed to update follow status');
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all ${isFollowing
                                            ? 'bg-surface text-inkLight border border-borderSubtle hover:bg-red-50 hover:text-red-500 hover:border-red-200'
                                            : 'bg-gold-gradient text-ink shadow-sm hover:shadow-md'
                                            }`}
                                    >
                                        {isFollowing ? (
                                            <>
                                                <UserCheck className="w-4 h-4" />
                                                Following
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-4 h-4" />
                                                Follow
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Schedule */}
                            {show.schedule_display && (
                                <div className="flex items-center gap-2 text-sm text-inkLight bg-surface px-4 py-3 rounded-xl border border-borderSubtle">
                                    <Clock className="w-4 h-4 text-gold" />
                                    {show.schedule_display}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 pt-4">
                                {show.external_link ? (
                                    <button
                                        onClick={handleWatchNow}
                                        className="bg-gold-gradient text-ink font-bold px-8 py-4 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-1 transition-all flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-5 h-5" />
                                        {getPlatformLabel(show.link_platform)}
                                    </button>
                                ) : (
                                    <button className="bg-surface text-inkLight font-bold px-8 py-4 rounded-full border border-borderSubtle cursor-not-allowed flex items-center gap-2">
                                        <Clock className="w-5 h-5" />
                                        Coming Soon
                                    </button>
                                )}

                                {/* Delete Button - Only show for creator */}
                                {isAuthenticated && userData?.id === show.creator.id && (
                                    <button
                                        onClick={() => setShowDeleteModal(true)}
                                        className="bg-red-500 hover:bg-red-600 text-ink font-bold px-6 py-4 rounded-full transition-all flex items-center gap-2"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete Show
                                    </button>
                                )}

                                <button className="bg-canvas border border-borderSubtle text-ink font-bold px-6 py-4 rounded-full hover:bg-surface transition-all flex items-center gap-2 shadow-sm">
                                    <Bell className="w-5 h-5" />
                                    Subscribe
                                </button>
                            </div>
                        </div>

                        {/* Right: Thumbnail */}
                        <div className="hidden lg:block">
                            <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-borderSubtle">
                                <img
                                    src={show.thumbnail || "https://picsum.photos/800/450"}
                                    alt={show.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactions Bar */}
            <div className="container max-w-[1280px] mx-auto px-6 mb-12">
                <div className="bg-canvas rounded-2xl border border-borderSubtle shadow-soft p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-6">
                            {/* Like Button */}
                            <button
                                onClick={handleLikeToggle}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${isLiked
                                    ? 'bg-red-50 text-red-500 border border-red-200'
                                    : 'bg-surface text-inkLight hover:bg-red-50 hover:text-red-500'
                                    }`}
                            >
                                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                                {likeCount} {likeCount === 1 ? 'Like' : 'Likes'}
                            </button>

                            {/* Comment Count */}
                            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-inkLight font-semibold hover:bg-gold-50 hover:text-gold transition-all">
                                <MessageCircle className="w-5 h-5" />
                                {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                            </button>
                        </div>

                        {/* Share Button */}
                        <div className="relative">
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-inkLight font-semibold hover:bg-blue-50 hover:text-blue-500 transition-all"
                            >
                                <Share2 className="w-5 h-5" />
                                Share
                            </button>

                            {showSharePopup && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute right-0 top-full mt-2 bg-canvas text-ink px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-borderSubtle"
                                >
                                    Link copied! ✓
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            <div className="container max-w-[1280px] mx-auto px-6">
                <div className="bg-canvas rounded-2xl border border-borderSubtle shadow-soft p-8">
                    <h2 className="text-2xl font-bold text-ink mb-6">Comments</h2>

                    {/* Add Comment Form */}
                    {isAuthenticated ? (
                        <form onSubmit={handleAddComment} className="mb-8">
                            <div className="flex gap-4">
                                <img
                                    src={userData?.profile_picture || "https://picsum.photos/100/100"}
                                    alt="Your avatar"
                                    className="w-10 h-10 rounded-full border-2 border-borderSubtle"
                                />
                                <div className="flex-1">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="w-full p-4 border border-borderSubtle rounded-xl resize-none focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all font-medium text-ink bg-canvas"
                                        rows={3}
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            type="submit"
                                            disabled={!commentText.trim() || submittingComment}
                                            className="bg-gold-gradient text-ink font-bold px-6 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                                        >
                                            {submittingComment ? 'Posting...' : 'Post Comment'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <div className="mb-8 p-6 bg-surface rounded-xl text-center">
                            <p className="text-inkLight font-medium mb-3">
                                Please connect your wallet to join the conversation
                            </p>
                            <button
                                onClick={connectWallet}
                                className="bg-gold-gradient text-ink font-bold px-6 py-2 rounded-full hover:shadow-lg transition-all"
                            >
                                Connect Wallet
                            </button>
                        </div>
                    )}

                    {/* Comments List */}
                    <div className="space-y-6">
                        {comments.length === 0 ? (
                            <div className="text-center py-12">
                                <MessageCircle className="w-12 h-12 text-inkLight mx-auto mb-3" />
                                <p className="text-inkLight font-medium">
                                    No comments yet. Be the first to comment!
                                </p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-4 pb-6 border-b border-borderSubtle last:border-0">
                                    <img
                                        src={comment.user.profile_picture || "https://picsum.photos/100/100"}
                                        alt={comment.user.username}
                                        className="w-10 h-10 rounded-full border-2 border-borderSubtle"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-ink">
                                                {comment.user.username}
                                            </span>
                                            <span className="text-xs text-inkLight">
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-ink font-medium mb-2">
                                            {comment.text}
                                        </p>

                                        {/* Delete button (only for own comments) */}
                                        {isAuthenticated && comment.user.id === userData.id && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-xs text-red-500 hover:text-red-700 font-semibold"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-canvas rounded-3xl shadow-2xl max-w-md w-full p-8 border border-borderSubtle"
                    >
                        {/* Icon */}
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-ink text-center mb-2">
                            Delete Show?
                        </h3>

                        {/* Description */}
                        <p className="text-inkLight text-center mb-2">
                            Are you sure you want to delete
                        </p>
                        <p className="text-ink font-semibold text-center mb-6">
                            "{show?.title}"?
                        </p>
                        <p className="text-sm text-red-600 text-center mb-8">
                            This action cannot be undone.
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-6 py-3 bg-surface text-ink font-semibold rounded-full hover:bg-borderSubtle transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteShow}
                                className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 text-ink font-semibold rounded-full transition-all shadow-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </motion.div>
                </div>
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
        </div>
    );
};


