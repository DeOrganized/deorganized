import React, { useState, useEffect } from 'react';
import { Loader2, Globe, Twitter, Users, Heart } from 'lucide-react';
import {
    Community, Membership, MembershipRole, Show, Event, Merch,
    getCommunity, getCommunityFeed, getCommunityShows, getCommunityEvents,
    getCommunityMerch, getCommunityMembers, toggleCommunityFollow,
    getImageUrl,
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

// ─── Simple tab content renderers ────────────────────────────────────────────

const FeedTab: React.FC<{ posts: any[] }> = ({ posts }) => {
    if (posts.length === 0) {
        return <EmptyState message="No posts yet." />;
    }
    return (
        <div className="space-y-4">
            {posts.map((post) => (
                <div key={post.id} className="bg-surface border border-borderSubtle rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-xl bg-canvas overflow-hidden shrink-0">
                            {post.author?.profile_picture ? (
                                <img src={getImageUrl(post.author.profile_picture) || ''} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-black text-inkLight">
                                    {post.author?.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-black text-ink">{post.author?.username}</span>
                        <span className="text-xs text-inkLight ml-auto">
                            {new Date(post.created_at).toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-sm text-ink whitespace-pre-wrap">{post.content}</p>
                    {post.image && (
                        <img
                            src={getImageUrl(post.image) || ''}
                            alt=""
                            className="mt-3 rounded-xl w-full max-h-64 object-cover"
                        />
                    )}
                    <div className="flex items-center gap-3 mt-3 text-inkLight text-xs">
                        <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" /> {post.like_count}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ShowsTab: React.FC<{ shows: Show[]; onNavigate: (page: any, id?: string | number) => void }> = ({ shows, onNavigate }) => {
    if (shows.length === 0) return <EmptyState message="No shows yet." />;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shows.map((show) => (
                <div
                    key={show.id}
                    className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden cursor-pointer hover:border-gold/40 transition-colors"
                    onClick={() => onNavigate('show-detail', show.slug)}
                >
                    {show.thumbnail ? (
                        <img src={getImageUrl(show.thumbnail) || ''} alt={show.title} className="w-full h-32 object-cover" />
                    ) : (
                        <div className="w-full h-32 bg-canvas" />
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

const EventsTab: React.FC<{ events: Event[]; onNavigate: (page: any, id?: string | number) => void }> = ({ events, onNavigate }) => {
    if (events.length === 0) return <EmptyState message="No events yet." />;
    return (
        <div className="space-y-3">
            {events.map((event) => (
                <div
                    key={event.id}
                    className="bg-surface border border-borderSubtle rounded-2xl p-4 cursor-pointer hover:border-gold/40 transition-colors flex gap-4"
                    onClick={() => onNavigate('event-detail', event.slug || event.id)}
                >
                    {event.banner_image && (
                        <img
                            src={getImageUrl(event.banner_image) || ''}
                            alt={event.title}
                            className="w-20 h-16 rounded-xl object-cover shrink-0"
                        />
                    )}
                    <div className="flex-1 min-w-0">
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

const MerchTab: React.FC<{ merch: Merch[]; onNavigate: (page: any, id?: string | number) => void }> = ({ merch, onNavigate }) => {
    if (merch.length === 0) return <EmptyState message="No merch yet." />;
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
                        <div className="w-full h-32 bg-canvas" />
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

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-center py-16 text-inkLight text-sm">{message}</div>
);

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
            shows: () => getCommunityShows(community.slug, token).then((d) => setShows(d.results ?? d)),
            events: () => getCommunityEvents(community.slug, token).then((d) => setEvents(d.results ?? d)),
            merch: () => getCommunityMerch(community.slug, token).then((d) => setMerch(d.results ?? d)),
            members: () => getCommunityMembers(community.slug, token).then(setMembers),
        };

        loaders[activeTab]().catch(console.error).finally(() => setTabLoading(false));
    }, [activeTab, community?.slug]);

    const handleMembershipChanged = (id: number | null, role: MembershipRole | null) => {
        setMembershipId(id);
        setUserRole(role);
        if (community) {
            setCommunity({
                ...community,
                member_count: id ? community.member_count + 1 : Math.max(0, community.member_count - 1),
                user_membership: id && role ? { id, role, joined_at: new Date().toISOString() } : null,
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
            {/* Banner */}
            <div className="h-56 relative overflow-hidden rounded-b-none">
                {community.banner ? (
                    <img
                        src={getImageUrl(community.banner) || ''}
                        alt=""
                        className="w-full h-full object-cover"
                    />
                ) : (
                    /* Gradient fallback when no banner image */
                    <div
                        className="w-full h-full"
                        style={{
                            background: `linear-gradient(135deg,
                                hsl(${(community.name.charCodeAt(0) * 7) % 360}, 40%, 18%) 0%,
                                hsl(${(community.name.charCodeAt(0) * 7 + 60) % 360}, 30%, 12%) 50%,
                                hsl(43, 74%, 14%) 100%)`,
                        }}
                    >
                        <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <span className="text-[120px] font-black text-white select-none">
                                {community.name[0]?.toUpperCase()}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Header — avatar overlaps banner bottom edge */}
            <div className="px-4 sm:px-6">
                <div className="flex items-end justify-between -mt-12 mb-5">
                    {/* Avatar — larger, overlapping the banner */}
                    <div className="w-24 h-24 rounded-2xl border-4 border-canvas bg-surface overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                        {community.avatar ? (
                            <img
                                src={getImageUrl(community.avatar) || ''}
                                alt={community.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-4xl font-black text-inkLight">
                                {community.name[0]?.toUpperCase()}
                            </span>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pb-1">
                        {isBackendAuthenticated && (
                            <button
                                onClick={handleFollow}
                                disabled={followLoading}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-black transition-colors ${
                                    isFollowing
                                        ? 'bg-surface text-inkLight hover:text-red-400 border border-borderSubtle'
                                        : 'bg-surface text-inkLight hover:text-gold border border-borderSubtle'
                                }`}
                            >
                                {followLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Heart className={`w-4 h-4 ${isFollowing ? 'fill-current' : ''}`} />
                                )}
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

                {/* Community info */}
                <div className="mb-4">
                    <h1 className="text-2xl font-black text-ink mb-1">{community.name}</h1>
                    {community.description && (
                        <p className="text-sm text-inkLight mb-3 max-w-2xl leading-relaxed">{community.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-inkLight">
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {community.member_count} member{community.member_count !== 1 ? 's' : ''}
                        </span>
                        {community.founder && (
                            <span className="flex items-center gap-1.5">
                                Founded by{' '}
                                {community.founder.profile_picture && (
                                    <img
                                        src={getImageUrl(community.founder.profile_picture) || ''}
                                        alt={community.founder.username}
                                        className="w-4 h-4 rounded-full object-cover"
                                    />
                                )}
                                <strong className="text-ink">{community.founder.username}</strong>
                            </span>
                        )}
                        {community.website && (
                            <a
                                href={community.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-gold transition-colors"
                            >
                                <Globe className="w-3.5 h-3.5" /> Website
                            </a>
                        )}
                        {community.twitter && (
                            <span className="flex items-center gap-1">
                                <Twitter className="w-3.5 h-3.5" /> {community.twitter}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="px-4 sm:px-6">
                <CommunityNav
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    showManage={canManage}
                    onManage={() => onNavigate('community-manage', community.slug)}
                />
            </div>

            {/* Tab content */}
            <div className="px-4 sm:px-6 py-6">
                {tabLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-gold" />
                    </div>
                ) : (
                    <>
                        {activeTab === 'feed' && <FeedTab posts={feedPosts} />}
                        {activeTab === 'shows' && <ShowsTab shows={shows} onNavigate={onNavigate} />}
                        {activeTab === 'events' && <EventsTab events={events} onNavigate={onNavigate} />}
                        {activeTab === 'merch' && <MerchTab merch={merch} onNavigate={onNavigate} />}
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
