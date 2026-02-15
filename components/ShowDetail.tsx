import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, Share2, Play, Calendar, Clock, User, Users, Bell, UserPlus, UserCheck, ExternalLink, Hash, MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react';
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
    updateComment,
    toggleFollow,
    checkIsFollowing,
    trackShare,
    deleteShow,
    createGuestRequest,
    CONTENT_TYPES,
    Show,
    Comment,
    checkExistingGuestRequest
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
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [commentMenuId, setCommentMenuId] = useState<number | null>(null);
    const [showGuestRequestModal, setShowGuestRequestModal] = useState(false);
    const [guestRequestMessage, setGuestRequestMessage] = useState('');
    const [submittingGuestRequest, setSubmittingGuestRequest] = useState(false);
    const [hasExistingRequest, setHasExistingRequest] = useState(false);

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

    // Check if user already requested guest spot
    useEffect(() => {
        const checkRequest = async () => {
            if (accessToken && show) {
                const hasRequest = await checkExistingGuestRequest(show.id, accessToken);
                setHasExistingRequest(hasRequest);
            }
        };
        checkRequest();
    }, [accessToken, show]);


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

    const handleEditComment = async (commentId: number) => {
        if (!editCommentText.trim() || !accessToken) return;
        try {
            await updateComment(commentId, editCommentText, accessToken);

            // Re-fetch comments to get full updated data
            if (show) {
                const updatedComments = await fetchComments(CONTENT_TYPES.SHOW, show.id, true, accessToken);
                setComments(updatedComments);
            }
            setEditingCommentId(null);
            setEditCommentText('');
        } catch (error) {
            console.error('Failed to edit comment:', error);
            alert('Failed to edit comment');
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

    // Convert platform URLs to embed URLs
    const getEmbedUrl = (url: string, platform?: string): string | null => {
        if (!url) return null;

        try {
            // YouTube
            if (platform === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be')) {
                let videoId = '';
                if (url.includes('youtube.com/watch')) {
                    videoId = new URL(url).searchParams.get('v') || '';
                } else if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1]?.split(/[?&]/)[0] || '';
                } else if (url.includes('youtube.com/live/')) {
                    videoId = url.split('youtube.com/live/')[1]?.split(/[?&]/)[0] || '';
                }
                if (videoId) return `https://www.youtube.com/embed/${videoId}`;
            }

            // Twitch
            if (platform === 'twitch' || url.includes('twitch.tv')) {
                let channelName = '';
                if (url.includes('twitch.tv/')) {
                    const parts = url.split('twitch.tv/')[1]?.split(/[?&/]/);
                    channelName = parts?.[0] || '';
                }
                if (channelName) {
                    // Get current domain for parent parameter (required by Twitch)
                    const currentDomain = window.location.hostname;
                    return `https://player.twitch.tv/?channel=${channelName}&parent=${currentDomain}`;
                }
            }

            // Kick
            if (platform === 'kick' || url.includes('kick.com')) {
                let channelName = '';
                if (url.includes('kick.com/')) {
                    channelName = url.split('kick.com/')[1]?.split(/[?&/]/)[0] || '';
                }
                if (channelName) return `https://player.kick.com/${channelName}`;
            }

            // Rumble
            if (platform === 'rumble' || url.includes('rumble.com')) {
                let videoId = '';
                if (url.includes('rumble.com/')) {
                    videoId = url.split('rumble.com/')[1]?.split(/[?&-]/)[0] || '';
                }
                if (videoId) return `https://rumble.com/embed/${videoId}/`;
            }

            return null;
        } catch (error) {
            console.error('Error generating embed URL:', error);
            return null;
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

    const handleGuestRequest = async () => {
        if (!isAuthenticated || !accessToken || !show) {
            connectWallet();
            return;
        }

        if (userData?.role !== 'creator') {
            setErrorMessage('Only creators can request guest appearances');
            setShowErrorToast(true);
            setTimeout(() => setShowErrorToast(false), 3000);
            return;
        }

        try {
            setSubmittingGuestRequest(true);
            await createGuestRequest(show.id, guestRequestMessage, accessToken);
            setShowGuestRequestModal(false);
            setGuestRequestMessage('');
            setToastMessage('Guest request sent successfully! 🎉');
            setShowSuccessToast(true);
            setTimeout(() => setShowSuccessToast(false), 3000);
            setHasExistingRequest(true);
        } catch (error: any) {
            console.error('Failed to send guest request:', error);
            setErrorMessage(error.message || 'Failed to send guest request. Please try again.');
            setShowErrorToast(true);
            setTimeout(() => setShowErrorToast(false), 3000);
        } finally {
            setSubmittingGuestRequest(false);
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

                            {/* Guests Section */}
                            {show.guests && show.guests.length > 0 && (
                                <div className="bg-surface px-4 py-3 rounded-xl border border-borderSubtle">
                                    <h3 className="text-sm font-bold text-ink mb-2 flex items-center gap-2">
                                        <UserPlus className="w-4 h-4 text-purple-500" />
                                        Featured Guests ({show.guests.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {show.guests.map((guest) => (
                                            <div
                                                key={guest.id}
                                                className="flex items-center gap-2 bg-canvas px-3 py-2 rounded-full hover:bg-gold-50 transition-all cursor-pointer"
                                                onClick={() => onNavigate?.('creator-detail', guest.id)}
                                            >
                                                <img
                                                    src={guest.profile_picture || '/default-avatar.png'}
                                                    alt={guest.username}
                                                    className="w-6 h-6 rounded-full object-cover"
                                                />
                                                <span className="text-sm font-semibold text-ink">{guest.username}</span>
                                                {guest.is_verified && (
                                                    <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                        ))}
                                    </div>
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

                                {/* Request Guest Spot Button - Only for other creators */}
                                {isAuthenticated && userData?.role === 'creator' && userData?.id !== show.creator.id && (
                                    hasExistingRequest ? (
                                        <div className="bg-purple-100 border-2 border-purple-500 text-purple-700 font-bold px-6 py-4 rounded-full flex items-center gap-2">
                                            <Clock className="w-5 h-5" />
                                            Request Pending
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowGuestRequestModal(true)}
                                            className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-6 py-4 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-purple-500/20"
                                        >
                                            <UserPlus className="w-5 h-5" />
                                            Request Guest Spot
                                        </button>
                                    )
                                )}

                                <button className="bg-canvas border border-borderSubtle text-ink font-bold px-6 py-4 rounded-full hover:bg-surface transition-all flex items-center gap-2 shadow-sm">
                                    <Bell className="w-5 h-5" />
                                    Subscribe
                                </button>
                            </div>
                        </div>

                        {/* Right: Thumbnail or Video Embed */}
                        <div className="hidden lg:block">
                            <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl border border-borderSubtle bg-surface">
                                {(() => {
                                    const embedUrl = show.external_link ? getEmbedUrl(show.external_link, show.link_platform) : null;

                                    if (embedUrl) {
                                        // Show embedded video/stream
                                        return (
                                            <iframe
                                                src={embedUrl}
                                                className="w-full h-full"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                                title={show.title}
                                            />
                                        );
                                    } else {
                                        // Fallback to thumbnail
                                        return (
                                            <img
                                                src={show.thumbnail || "https://picsum.photos/800/450"}
                                                alt={show.title}
                                                className="w-full h-full object-cover"
                                            />
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactions Bar */}
            <div className="container max-w-[1280px] mx-auto px-4 sm:px-6 mb-8 sm:mb-12">
                <div className="bg-canvas rounded-2xl border border-borderSubtle shadow-soft p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex gap-2 sm:gap-6">
                            {/* Like Button */}
                            <button
                                onClick={handleLikeToggle}
                                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold transition-all text-sm sm:text-base ${isLiked
                                    ? 'bg-red-50 text-red-500 border border-red-200'
                                    : 'bg-surface text-inkLight hover:bg-red-50 hover:text-red-500'
                                    }`}
                            >
                                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${isLiked ? 'fill-current' : ''}`} />
                                <span className="hidden sm:inline">{likeCount} {likeCount === 1 ? 'Like' : 'Likes'}</span>
                                <span className="sm:hidden">{likeCount}</span>
                            </button>

                            {/* Comment Count */}
                            <button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-surface text-inkLight font-semibold hover:bg-gold-50 hover:text-gold transition-all text-sm sm:text-base">
                                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
                                <span className="sm:hidden">{comments.length}</span>
                            </button>
                        </div>

                        {/* Share Button */}
                        <div className="relative">
                            <button
                                onClick={handleShare}
                                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full bg-surface text-inkLight font-semibold hover:bg-blue-50 hover:text-blue-500 transition-all text-sm sm:text-base"
                            >
                                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Share</span>
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
                                <div key={comment.id} className="flex gap-3 group pb-6 border-b border-borderSubtle last:border-0">
                                    <div
                                        className="w-8 h-8 rounded-full overflow-hidden bg-surface flex-shrink-0 cursor-pointer"
                                        onClick={() => onNavigate?.('creator-detail', comment.user.id)}
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
                                            <span className="text-xs text-inkLight">
                                                {new Date(comment.created_at).toLocaleDateString()}
                                            </span>

                                        </div>

                                        {editingCommentId === comment.id ? (
                                            <div className="mt-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={editCommentText}
                                                    onChange={(e) => setEditCommentText(e.target.value)}
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
                                                    onClick={() => { setEditingCommentId(null); setEditCommentText(''); }}
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
                                    {isAuthenticated && comment.user.id === userData.id && editingCommentId !== comment.id && (
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
                                                            setEditCommentText(comment.text);
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

            {/* Guest Request Modal */}
            {showGuestRequestModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-canvas rounded-3xl shadow-2xl max-w-md w-full p-8 border border-borderSubtle"
                    >
                        {/* Icon */}
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserPlus className="w-8 h-8 text-purple-600" />
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-bold text-ink text-center mb-2">
                            Request Guest Spot
                        </h3>

                        {/* Message */}
                        <p className="text-inkSubtle text-center mb-6">
                            Send a request to appear as a guest on "{show?.title}"
                        </p>

                        {/* Message Input */}
                        <textarea
                            value={guestRequestMessage}
                            onChange={(e) => setGuestRequestMessage(e.target.value)}
                            placeholder="Add a message to introduce yourself... (optional)"
                            className="w-full p-4 border border-borderSubtle rounded-xl resize-none focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-medium text-ink bg-surface mb-6"
                            rows={4}
                            maxLength={500}
                        />
                        <div className="text-xs text-inkLight text-right mb-4">
                            {guestRequestMessage.length}/500 characters
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowGuestRequestModal(false);
                                    setGuestRequestMessage('');
                                }}
                                disabled={submittingGuestRequest}
                                className="flex-1 px-6 py-3 bg-surface text-ink font-semibold rounded-full hover:bg-borderSubtle transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleGuestRequest}
                                disabled={submittingGuestRequest}
                                className="flex-1 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-full transition-all shadow-lg disabled:opacity-50"
                            >
                                {submittingGuestRequest ? 'Sending...' : 'Send Request'}
                            </button>
                        </div>
                    </motion.div>
                    {/* Success Toast */}
                    {showSuccessToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-8 right-8 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold">{toastMessage}</span>
                        </motion.div>
                    )}

                    {/* Error Toast */}
                    {showErrorToast && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 50 }}
                            className="fixed bottom-8 right-8 bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-bold">{errorMessage}</span>
                        </motion.div>
                    )}

                </div>
            )}
        </div>
    );
};
