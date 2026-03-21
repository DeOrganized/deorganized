import React, { useState, useEffect, useRef } from 'react';
import {
    Loader2, Globe, Twitter, Users, Heart,
    Image as ImageIcon, X, MessageSquare,
    Calendar, ShoppingBag, Tv, Send,
} from 'lucide-react';
import {
    Community, Membership, MembershipRole, Show, Event, Merch,
    getCommunity, getCommunityFeed, getCommunityShows, getCommunityEvents,
    getCommunityMerch, getCommunityMembers, toggleCommunityFollow,
    createPost, getImageUrl,
} from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { CommunityNav } from './CommunityNav';
import { JoinButton } from './JoinButton';
import { CommunityMembers } from './CommunityMembers';

type CommunityTab = 'feed' | 'shows' | 'events' | 'merch' | 'members';

interface Props {
    slug: string;
    onNavigate: (page: any, id?: string | number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
}

// Deterministic gradient from community name — unique per community
function communityGradient(name: string): string {
    const h1 = (name.charCodeAt(0) * 13 + name.charCodeAt(1) * 7) % 360;
    const h2 = (h1 + 80) % 360;
    return `linear-gradient(135deg, hsl(${h1},45%,20%) 0%, hsl(${h2},35%,13%) 60%, hsl(43,60%,9%) 100%)`;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({
    icon, title, subtitle,
}) => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-surface border border-borderSubtle flex items-center justify-center text-inkLight/30 mb-4">
            {icon}
        </div>
        <p className="text-sm font-black text-inkLight mb-1">{title}</p>
        {subtitle && <p className="text-xs text-inkLight/50 max-w-xs">{subtitle}</p>}
    </div>
);

// ─── Post Composer ────────────────────────────────────────────────────────────

interface PostComposerProps {
    communityId: number;
    communityName: string;
    onPosted: (post: any) => void;
}

const PostComposer: React.FC<PostComposerProps> = ({ communityId, communityName, onPosted }) => {
    const { accessToken, backendUser } = useAuth();
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        setImageFile(null);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || !accessToken) return;
        setSubmitting(true);
        try {
            const fd = new FormData();
            fd.append('content', content.trim());
            fd.append('community', String(communityId));
            if (imageFile) fd.append('image', imageFile);
            const post = await createPost(fd, accessToken);
            onPosted(post);
            setContent('');
            clearImage();
        } catch (err) {
            console.error('Post failed:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const initial = backendUser?.username?.[0]?.toUpperCase() ?? '?';

    return (
        <form onSubmit={handleSubmit} className="bg-surface border border-borderSubtle rounded-2xl p-4 mb-5">
            <div className="flex gap-3">
                {/* Author avatar */}
                <div className="w-9 h-9 rounded-xl bg-gold/15 flex items-center justify-center shrink-0 text-sm font-black text-gold overflow-hidden">
                    {(backendUser as any)?.profile_picture
                        ? <img src={getImageUrl((backendUser as any).profile_picture) || ''} className="w-full h-full object-cover" alt="" />
                        : initial
                    }
                </div>
                {/* Text input */}
                <div className="flex-1 min-w-0">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={`Post to ${communityName}...`}
                        rows={content.length > 80 ? 3 : 2}
                        className="w-full bg-transparent text-sm text-ink placeholder:text-inkLight/50 resize-none focus:outline-none leading-relaxed"
                    />
                    {imagePreview && (
                        <div className="relative mt-2 rounded-xl overflow-hidden max-w-xs border border-borderSubtle">
                            <img src={imagePreview} alt="" className="w-full max-h-44 object-cover" />
                            <button
                                type="button"
                                onClick={clearImage}
                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Toolbar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-borderSubtle">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-inkLight hover:text-gold transition-colors"
                >
                    <ImageIcon className="w-4 h-4" /> Photo
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                <button
                    type="submit"
                    disabled={!content.trim() || submitting}
                    className="flex items-center gap-1.5 bg-gold text-black text-xs font-black px-4 py-1.5 rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Post
                </button>
            </div>
        </form>
    );
};

// ─── Post Card ────────────────────────────────────────────────────────────────

const PostCard: React.FC<{ post: any }> = ({ post }) => (
    <div className="bg-surface border border-borderSubtle rounded-2xl p-4">
        <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-canvas overflow-hidden shrink-0 flex items-center justify-center border border-borderSubtle">
                {post.author?.profile_picture ? (
                    <img src={getImageUrl(post.author.profile_picture) || ''} alt="" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xs font-black text-inkLight">
                        {post.author?.username?.[0]?.toUpperCase()}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-ink leading-none">{post.author?.username}</p>
            </div>
            <span className="text-xs text-inkLight/60 shrink-0">{timeAgo(post.created_at)}</span>
        </div>
        <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{post.content}</p>
        {post.image && (
            <img
                src={getImageUrl(post.image) || ''}
                alt=""
                className="mt-3 rounded-xl w-full max-h-72 object-cover"
            />
        )}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-borderSubtle text-xs text-inkLight">
            <span className="flex items-center gap-1">
                <Heart className="w-3 h-3" /> {post.like_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> {post.comment_count ?? 0}
            </span>
        </div>
    </div>
);

// ─── Tab renderers ────────────────────────────────────────────────────────────

interface FeedTabProps {
    posts: any[];
    community: Community;
    isMember: boolean;
    onPostCreated: (post: any) => void;
}

const FeedTab: React.FC<FeedTabProps> = ({ posts, community, isMember, onPostCreated }) => (
    <div>
        {isMember && (
            <PostComposer
                communityId={community.id}
                communityName={community.name}
                onPosted={onPostCreated}
            />
        )}
        {posts.length === 0 ? (
            <EmptyState
                icon={<MessageSquare className="w-7 h-7" />}
                title="No posts yet"
                subtitle={isMember ? 'Be the first to post in this community' : 'Join to post in this community'}
            />
        ) : (
            <div className="space-y-4">
                {posts.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
        )}
    </div>
);

const ShowsTab: React.FC<{ shows: Show[]; onNavigate: (page: any, id?: string | number) => void }> = ({
    shows, onNavigate,
}) => {
    if (shows.length === 0) {
        return (
            <EmptyState
                icon={<Tv className="w-7 h-7" />}
                title="No shows yet"
                subtitle="Shows from this community will appear here"
            />
        );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shows.map((show) => (
                <div
                    key={show.id}
                    className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden cursor-pointer hover:border-gold/40 transition-colors group"
                    onClick={() => onNavigate('show-detail', show.slug)}
                >
                    {show.thumbnail ? (
                        <img
                            src={getImageUrl(show.thumbnail) || ''}
                            alt={show.title}
                            className="w-full h-36 object-cover group-hover:opacity-90 transition-opacity"
                        />
                    ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-surface to-canvas flex flex-col items-center justify-center gap-2 p-4">
                            <Tv className="w-8 h-8 text-inkLight/25" />
                            <p className="text-xs font-black text-inkLight/60 text-center leading-tight line-clamp-2">
                                {show.title}
                            </p>
                        </div>
                    )}
                    <div className="p-3">
                        <h3 className="font-black text-sm text-ink truncate">{show.title}</h3>
                        {show.schedule_display && (
                            <p className="text-xs text-inkLight mt-1">{show.schedule_display}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const EventsTab: React.FC<{ events: Event[]; onNavigate: (page: any, id?: string | number) => void }> = ({
    events, onNavigate,
}) => {
    if (events.length === 0) {
        return (
            <EmptyState
                icon={<Calendar className="w-7 h-7" />}
                title="No events yet"
                subtitle="Upcoming events will appear here"
            />
        );
    }
    return (
        <div className="space-y-3">
            {events.map((event) => (
                <div
                    key={event.id}
                    className="bg-surface border border-borderSubtle rounded-2xl p-4 cursor-pointer hover:border-gold/40 transition-colors flex gap-4"
                    onClick={() => onNavigate('event-detail', event.slug || event.id)}
                >
                    {event.banner_image ? (
                        <img
                            src={getImageUrl(event.banner_image) || ''}
                            alt={event.title}
                            className="w-20 h-16 rounded-xl object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-20 h-16 rounded-xl bg-canvas flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-inkLight/30" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0 self-center">
                        <h3 className="font-black text-sm text-ink truncate">{event.title}</h3>
                        <p className="text-xs text-inkLight mt-1">
                            {new Date(event.start_datetime).toLocaleDateString()}
                            {event.venue_name && ` · ${event.venue_name}`}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const MerchTab: React.FC<{ merch: Merch[]; onNavigate: (page: any, id?: string | number) => void }> = ({
    merch, onNavigate,
}) => {
    if (merch.length === 0) {
        return (
            <EmptyState
                icon={<ShoppingBag className="w-7 h-7" />}
                title="No merch yet"
                subtitle="Merch drops will appear here"
            />
        );
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {merch.map((item) => (
                <div
                    key={item.id}
                    className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden cursor-pointer hover:border-gold/40 transition-colors"
                    onClick={() => onNavigate('merch-detail', item.slug)}
                >
                    {item.image ? (
                        <img src={getImageUrl(item.image) || ''} alt={item.name} className="w-full h-32 object-cover" />
                    ) : (
                        <div className="w-full h-32 bg-canvas flex items-center justify-center">
                            <ShoppingBag className="w-8 h-8 text-inkLight/25" />
                        </div>
                    )}
                    <div className="p-3">
                        <h3 className="font-black text-xs text-ink truncate">{item.name}</h3>
                        <p className="text-xs text-gold mt-1">{item.price_stx} STX</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─── Main CommunityPage ───────────────────────────────────────────────────────

export const CommunityPage: React.FC<Props> = ({ slug, onNavigate }) => {
    const { accessToken, isBackendAuthenticated } = useAuth();

    const [community, setCommunity] = useState<Community | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<CommunityTab>('feed');

    const [membershipId, setMembershipId] = useState<number | null>(null);
    const [userRole, setUserRole] = useState<MembershipRole | null>(null);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Tab data
    const [feedPosts, setFeedPosts] = useState<any[]>([]);
    const [shows, setShows] = useState<Show[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [merch, setMerch] = useState<Merch[]>([]);
    const [members, setMembers] = useState<Membership[]>([]);
    const [tabLoading, setTabLoading] = useState(false);

    // Load community on mount
    useEffect(() => {
        setLoading(true);
        getCommunity(slug, accessToken || undefined)
            .then((c) => {
                setCommunity(c);
                setMembershipId(c.user_membership?.id ?? null);
                setUserRole((c.user_membership?.role as MembershipRole) ?? null);
                setIsFollowing(c.user_is_following);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [slug]);

    // Load tab data when tab changes
    useEffect(() => {
        if (!community) return;
        setTabLoading(true);
        const token = accessToken || undefined;

        const loaders: Record<CommunityTab, () => Promise<void>> = {
            feed: () =>
                getCommunityFeed(community.slug, 1, token).then((d) =>
                    setFeedPosts(d.results ?? d)
                ),
            shows: () =>
                getCommunityShows(community.slug, token).then((d) => setShows(d.results ?? d)),
            events: () =>
                getCommunityEvents(community.slug, token).then((d) => setEvents(d.results ?? d)),
            merch: () =>
                getCommunityMerch(community.slug, token).then((d) => setMerch(d.results ?? d)),
            members: () =>
                getCommunityMembers(community.slug, token).then(setMembers),
        };

        loaders[activeTab]().catch(console.error).finally(() => setTabLoading(false));
    }, [activeTab, community?.slug]);

    const handleMembershipChanged = (id: number | null, role: MembershipRole | null) => {
        setMembershipId(id);
        setUserRole(role);
        if (community) {
            setCommunity({
                ...community,
                member_count: id
                    ? community.member_count + 1
                    : Math.max(0, community.member_count - 1),
                user_membership: id && role
                    ? { id, role, joined_at: new Date().toISOString() }
                    : null,
            });
        }
    };

    const handleFollow = async () => {
        if (!accessToken) return;
        setFollowLoading(true);
        try {
            const result = await toggleCommunityFollow(slug, accessToken);
            setIsFollowing(result.following);
        } catch (err) {
            console.error('Follow toggle failed:', err);
        } finally {
            setFollowLoading(false);
        }
    };

    const canManage = userRole === 'founder' || userRole === 'admin' || userRole === 'moderator';
    const isMember = membershipId !== null;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
        );
    }

    if (!community) {
        return (
            <div className="text-center py-32 text-inkLight">Community not found.</div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto">

            {/* ── Banner ── */}
            <div className="h-48 relative overflow-hidden">
                {community.banner ? (
                    <img
                        src={getImageUrl(community.banner) || ''}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full" style={{ background: communityGradient(community.name) }}>
                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                            <span className="text-[180px] font-black text-white/[0.04] select-none leading-none">
                                {community.name[0]?.toUpperCase()}
                            </span>
                        </div>
                    </div>
                )}
                {/* Bottom fade so avatar reads against any banner */}
                <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-canvas/75 to-transparent pointer-events-none" />
            </div>

            {/* ── Header ── */}
            <div className="px-4 sm:px-6">

                {/* Avatar — overlaps banner */}
                <div className="-mt-12 mb-4 relative z-10">
                    <div className="w-24 h-24 rounded-2xl border-[3px] border-canvas bg-surface overflow-hidden flex items-center justify-center shadow-xl">
                        {community.avatar ? (
                            <img
                                src={getImageUrl(community.avatar) || ''}
                                alt={community.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-4xl font-black text-gold/50">
                                {community.name[0]?.toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>

                {/* Community name + action buttons on same row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h1 className="text-2xl font-black text-ink leading-tight">{community.name}</h1>
                    <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        {isBackendAuthenticated && (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-black transition-colors border ${
                                    isFollowing
                                        ? 'bg-surface border-borderSubtle text-red-400'
                                        : 'bg-surface border-borderSubtle text-inkLight hover:text-gold hover:border-gold/40'
                                }`}
                            >
                                {followLoading
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                                }
                                {isFollowing ? 'Following' : 'Follow'}
                            </button>
                        )}
                        <JoinButton
                            communitySlug={community.slug}
                            membershipId={membershipId}
                            membershipRole={userRole}
                            onChanged={handleMembershipChanged}
                        />
                    </div>
                </div>

                {/* Description */}
                {community.description && (
                    <p className="text-sm text-inkLight mb-4 max-w-2xl leading-relaxed">
                        {community.description}
                    </p>
                )}

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-inkLight mb-6">
                    <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                    </span>
                    {community.founder && (
                        <>
                            <span className="text-borderSubtle">·</span>
                            <span className="flex items-center gap-1.5">
                                Founded by
                                {community.founder.profile_picture && (
                                    <img
                                        src={getImageUrl(community.founder.profile_picture) || ''}
                                        alt={community.founder.username}
                                        className="w-4 h-4 rounded-full object-cover"
                                    />
                                )}
                                <strong className="text-ink font-bold">{community.founder.username}</strong>
                            </span>
                        </>
                    )}
                    {community.website && (
                        <>
                            <span className="text-borderSubtle">·</span>
                            <a
                                href={community.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-gold transition-colors"
                            >
                                <Globe className="w-3.5 h-3.5" /> Website
                            </a>
                        </>
                    )}
                    {community.twitter && (
                        <>
                            <span className="text-borderSubtle">·</span>
                            <span className="flex items-center gap-1.5">
                                <Twitter className="w-3.5 h-3.5" /> {community.twitter}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="px-4 sm:px-6">
                <CommunityNav
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    showManage={canManage}
                    onManage={() => onNavigate('community-manage', community.slug)}
                />
            </div>

            {/* ── Tab content ── */}
            <div className="px-4 sm:px-6 py-6">
                {tabLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'feed' && (
                            <FeedTab
                                posts={feedPosts}
                                community={community}
                                isMember={isMember}
                                onPostCreated={(post) => setFeedPosts((prev) => [post, ...prev])}
                            />
                        )}
                        {activeTab === 'shows' && (
                            <ShowsTab shows={shows} onNavigate={onNavigate} />
                        )}
                        {activeTab === 'events' && (
                            <EventsTab events={events} onNavigate={onNavigate} />
                        )}
                        {activeTab === 'merch' && (
                            <MerchTab merch={merch} onNavigate={onNavigate} />
                        )}
                        {activeTab === 'members' && (
                            <CommunityMembers
                                communitySlug={community.slug}
                                members={members}
                                userRole={userRole}
                                userMembershipId={membershipId}
                                onMembersChanged={setMembers}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
