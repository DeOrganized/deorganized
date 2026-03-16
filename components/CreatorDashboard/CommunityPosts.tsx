import React, { useState, useEffect } from 'react';
import {
    MessageSquare, Send, Trash2, Heart, Share2,
    MoreHorizontal, Plus, Loader2, Image as ImageIcon,
    Globe, Lock, Users, Clock, Smile, Paperclip, Filter, Crown, X, Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { fetchPosts, createPost, updatePost, deletePost, CreatorPost } from '../../lib/api';
import { useToast } from '../Toast';

export const CommunityPosts: React.FC = () => {
    const { accessToken, backendUser } = useAuth();
    const toast = useToast();
    const [posts, setPosts] = useState<CreatorPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create Post State
    const [content, setContent] = useState('');
    const [postType, setPostType] = useState<'public' | 'gated' | 'supporters'>('public');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Edit Post State
    const [editingPost, setEditingPost] = useState<CreatorPost | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editImageFile, setEditImageFile] = useState<File | null>(null);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (accessToken && backendUser) {
            loadPosts();
        }
    }, [accessToken, backendUser]);

    const loadPosts = async () => {
        try {
            setLoading(true);
            // Fetch posts by the current creator
            const data = await fetchPosts({ author: backendUser?.id }, accessToken!);
            setPosts(data.results || data);
            setError(null);
        } catch (err) {
            console.error('Failed to load posts:', err);
            setError('Could not load community posts.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !accessToken) return;

        try {
            setSubmitting(true);

            const formData = new FormData();
            formData.append('content', content);
            // formData.append('visibility', postType); // API handles visibility? 
            // In the backend it's just 'content' and 'image' for now
            if (imageFile) {
                formData.append('image', imageFile);
            }

            const newPost = await createPost(formData, accessToken);
            setPosts([newPost, ...posts]);
            setContent('');
            setImageFile(null);
        } catch (err) {
            console.error('Failed to post:', err);
            toast.error('Failed to publish post. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!accessToken) return;
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            await deletePost(postId, accessToken);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (err) {
            console.error('Failed to delete post:', err);
            toast.error('Could not delete post.');
        }
    };

    const startEditing = (post: CreatorPost) => {
        setEditingPost(post);
        setEditContent(post.content);
        setEditImageFile(null);
    };

    const handleUpdatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPost || !editContent.trim() || !accessToken) return;

        try {
            setUpdating(true);
            const formData = new FormData();
            formData.append('content', editContent);
            if (editImageFile) {
                formData.append('image', editImageFile);
            }

            const updated = await updatePost(editingPost.id, formData, accessToken);
            setPosts(posts.map(p => p.id === updated.id ? updated : p));
            setEditingPost(null);
            setEditContent('');
            setEditImageFile(null);
        } catch (err) {
            console.error('Failed to update post:', err);
            toast.error('Failed to update post.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            {/* Create Post Card */}
            <div className="bg-canvas border border-borderSubtle rounded-[2rem] shadow-xl overflow-hidden">
                <form onSubmit={handleCreatePost} className="p-4 md:p-8 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="hidden md:flex w-12 h-12 rounded-full bg-gold-gradient flex-shrink-0 items-center justify-center font-black text-ink shadow-lg">
                            {backendUser?.username?.charAt(0).toUpperCase() || "C"}
                        </div>
                        <div className="flex-1 space-y-4">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind? Share an update with your community..."
                                className="w-full bg-transparent border-none focus:ring-0 text-base md:text-lg text-ink placeholder:text-inkLight resize-none min-h-[100px] md:min-h-[120px] p-0"
                            />

                            {imageFile && (
                                <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-borderSubtle aspect-video bg-surface">
                                    <img
                                        src={URL.createObjectURL(imageFile)}
                                        alt="Upload preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setImageFile(null)}
                                        className="absolute top-2 right-2 p-1.5 bg-ink/80 text-background rounded-full hover:bg-ink transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-borderSubtle/50">
                                <div className="flex items-center gap-1 md:gap-2">
                                    <input
                                        type="file"
                                        id="community-image-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files?.[0]) setImageFile(e.target.files[0]);
                                        }}
                                    />
                                    <label
                                        htmlFor="community-image-upload"
                                        className="p-2 text-inkLight hover:text-gold hover:bg-gold/5 rounded-xl transition-all cursor-pointer"
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                    </label>
                                    <button type="button" className="p-2 text-inkLight hover:text-gold hover:bg-gold/5 rounded-xl transition-all">
                                        <Paperclip className="w-5 h-5" />
                                    </button>
                                    <button type="button" className="p-2 text-inkLight hover:text-gold hover:bg-gold/5 rounded-xl transition-all">
                                        <Smile className="w-5 h-5" />
                                    </button>
                                    <div className="h-6 w-px bg-borderSubtle mx-1 md:mx-2" />
                                    <select
                                        value={postType}
                                        onChange={(e) => setPostType(e.target.value as any)}
                                        className="bg-surface border border-borderSubtle rounded-lg px-2 py-1 text-[10px] md:text-xs font-bold text-inkLight focus:outline-none focus:border-gold"
                                    >
                                        <option value="public">Public</option>
                                        <option value="supporters">Supporters Only</option>
                                        <option value="gated">Gated Content</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={!content.trim() || submitting}
                                    className="w-full sm:w-auto bg-gold-gradient text-ink font-bold px-6 md:px-8 py-2.5 md:py-3 rounded-2xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                    <span className="text-sm md:text-base">Post Update</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Post Feed */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-xl font-bold text-ink flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gold" />
                        Recent Updates
                    </h3>
                    <div className="flex gap-2">
                        <button className="p-2 text-inkLight hover:text-ink"><Filter className="w-5 h-5" /></button>
                        <button className="p-2 text-inkLight hover:text-ink"><MoreHorizontal className="w-5 h-5" /></button>
                    </div>
                </div>

                <AnimatePresence>
                    {posts.map((post, index) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-soft p-6 md:p-8 space-y-6 group relative"
                        >
                            {/* Visibility Badge */}
                            <div className="absolute top-8 right-8">
                                {post.is_pinned && (
                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-gold uppercase tracking-wider bg-gold/5 px-2.5 py-1 rounded-full">
                                        <Crown className="w-3 h-3" />
                                        Pinned
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-[1rem] bg-surface border border-borderSubtle flex-shrink-0 overflow-hidden relative">
                                    {post.author.profile_image ? (
                                        <img src={post.author.profile_image} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center font-bold text-inkLight">
                                            {post.author.username.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-ink">{post.author.username}</h4>
                                    <p className="text-xs text-inkLight font-medium">
                                        {new Date(post.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {editingPost?.id === post.id ? (
                                <form onSubmit={handleUpdatePost} className="space-y-4">
                                    <textarea
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full bg-surface border border-borderSubtle rounded-2xl p-4 text-ink focus:outline-none focus:border-gold min-h-[120px] text-base md:text-lg"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setEditingPost(null)}
                                            className="px-4 py-2 text-sm font-bold text-inkLight hover:text-ink transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updating || !editContent.trim()}
                                            className="px-6 py-2 bg-gold-gradient text-ink font-bold rounded-xl shadow-lg shadow-gold/20 disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {updating ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <>
                                    <div className="text-ink text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                                        {post.content}
                                    </div>

                                    {post.image && (
                                        <div className="rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-borderSubtle bg-surface">
                                            <img
                                                src={post.image}
                                                alt="Post content"
                                                className="w-full h-auto object-cover max-h-[600px]"
                                            />
                                        </div>
                                    )}
                                </>
                            )}



                            <div className="pt-6 border-t border-borderSubtle/50 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <button className="flex items-center gap-2 text-inkLight hover:text-rose-500 transition-colors group/btn">
                                        <div className="p-2 rounded-xl group-hover/btn:bg-rose-50 transition-colors">
                                            <Heart className={`w-5 h-5 ${post.user_has_liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                                        </div>
                                        <span className="text-sm font-bold">{post.like_count}</span>
                                    </button>
                                    <button className="flex items-center gap-2 text-inkLight hover:text-gold transition-colors group/btn">
                                        <div className="p-2 rounded-xl group-hover/btn:bg-gold/5 transition-colors">
                                            <MessageSquare className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-bold">{post.comment_count}</span>
                                    </button>
                                    <button className="flex items-center gap-2 text-inkLight hover:text-blue-500 transition-colors group/btn">
                                        <div className="p-2 rounded-xl group-hover/btn:bg-blue-50 transition-colors">
                                            <Share2 className="w-5 h-5" />
                                        </div>
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={() => startEditing(post)}
                                        className="p-2 text-inkLight hover:text-gold hover:bg-gold/5 rounded-xl transition-all"
                                        title="Edit post"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeletePost(post.id)}
                                        className="p-2 text-inkLight hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                        title="Delete post"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {posts.length === 0 && !loading && (
                    <div className="text-center py-20 bg-surface/30 rounded-[2.5rem] border border-dashed border-borderSubtle">
                        <MessageSquare className="w-16 h-16 mx-auto mb-4 text-inkLight opacity-20" />
                        <h3 className="text-xl font-bold text-ink mb-2">No updates yet</h3>
                        <p className="text-inkLight">Share your first update with your supporters!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
