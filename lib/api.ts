// API Configuration - Environment-aware
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
import { x402Fetch as x402RawFetch, X402PaymentOptions } from './x402Client';

export const x402Fetch = x402RawFetch;

export const getImageUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL.replace('/api', '')}${url}`;
};

// TypeScript Interfaces
export interface Tag {
    id: number;
    name: string;
    slug: string;
}

export interface Show {
    id: number;
    slug: string;
    title: string;
    description: string;
    thumbnail: string | null;
    scheduled_time: string | null;
    day_of_week: number | null;
    is_recurring: boolean;
    recurrence_type: 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | null;
    schedule_display: string | null;
    status: 'draft' | 'published' | 'archived';
    creator: {
        id: number;
        username: string;
        profile_picture: string | null;
        is_verified: boolean;
    };
    tags: Tag[];
    guests: {
        id: number;
        username: string;
        profile_picture: string | null;
        is_verified: boolean;
    }[];
    co_hosts: {
        id: number;
        username: string;
        profile_picture: string | null;
        is_verified: boolean;
    }[];
    external_link: string | null;
    link_platform: 'youtube' | 'twitter' | 'twitch' | 'rumble' | 'kick' | 'other' | '';
    like_count: number;
    comment_count: number;
    share_count: number;
    episode_count?: number;
}

export interface Notification {
    id: number;
    notification_type: 'follow' | 'like' | 'comment' | 'share' | 'show_reminder' | 'show_cancelled' | 'guest_request' | 'guest_accepted' | 'guest_declined' | 'co_host_added';
    message?: string;
    is_read: boolean;
    read?: boolean;
    created_at: string;
    show_slug?: string | null;
    show_title?: string | null;
    content_type?: number | null;
    content_type_name?: string | null;
    object_id?: number | null;
    recipient: {
        id: number;
        username: string;
    } | number;
    actor: {
        id: number;
        username: string;
        profile_picture?: string | null;
    };
}

export interface ShowReminder {
    id: number;
    show: number;
    show_id: number;
    show_title: string;
    scheduled_for: string;
    reminder_sent_at: string | null;
    creator_response: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
    responded_at: string | null;
    created_at: string;
}

export interface ShowInstance {
    date: string;
    time: string;
    datetime: string;
    status: string;
    reminder_status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | null;
}

export interface Merch {
    id: number;
    creator: number;
    creator_username: string;
    name: string;
    slug: string;
    description: string;
    price_stx: string;
    price_usdcx: string;
    stock: number;
    image: string | null;
    is_active: boolean;
    created_at: string;
}

export interface Order {
    id: number;
    user: number;
    username: string;
    merch: number;
    merch_name: string;
    quantity: number;
    tx_id: string;
    payment_currency: 'STX' | 'USDCx';
    amount_paid: string;
    status: 'pending' | 'paid' | 'shipped' | 'completed' | 'failed';
    shipping_address: string;
    created_at: string;
}

export interface CreatorStats {
    total_views: number;
    total_shares: number;
    total_likes: number;
    total_comments: number;
    follower_count: number;
    following_count: number;
    show_count: number;
    event_count: number;
}

export interface GuestRequest {
    id: number;
    show: {
        id: number;
        title: string;
        slug: string;
        thumbnail: string | null;
        creator: {
            id: number;
            username: string;
            profile_picture: string | null;
            is_verified: boolean;
        };
    };
    requester: {
        id: number;
        username: string;
        profile_picture: string | null;
        is_verified: boolean;
    };
    status: 'pending' | 'accepted' | 'declined';
    message: string;
    created_at: string;
    updated_at: string;
}

export interface User {
    id: number;
    username: string;
    display_name?: string;
    email?: string;
    bio?: string;
    profile_picture: string | null;
    cover_photo?: string | null;
    website?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    role: 'user' | 'creator';
    is_verified: boolean;
    stacks_address: string;
    follower_count?: number;
    following_count?: number;
    date_joined?: string;
}

// --- Playout & Subscription Interfaces ---

export interface DCPEStatus {
    status: string;
    mode: string;
    playlist_loaded: boolean;
    now_playing: string | null;
    rtmp_connected: boolean;
    streaming_enabled: boolean;
    last_prep_at: string | null;
    last_error: string | null;
    session_owner_id?: number | null;
    session_owner_username?: string | null;
}

export interface DCPEPlaylist {
    id: string;
    name: string;
    folder: string;
    track_count: number;
}

export interface RTMPDestination {
    id: number;
    platform: string;
    label: string;
    rtmp_url: string;
    stream_key: string;
    stream_key_masked?: string;
    is_active: boolean;
    created_at: string;
}

export interface BroadcastSchedule {
    broadcast_time: string | null;
    broadcast_days: number[];
    broadcast_timezone: string;
}

export interface SubscriptionData {
    id: number;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    plan_display?: string;
    status?: string;
    stx_address?: string;
    is_active: boolean;
    expires_at: string | null;
    current_period_end: string | null;
}

// --- Playout & Subscription Constants ---

export const PLATFORM_LABELS: Record<string, string> = {
    youtube: 'YouTube Live',
    twitch: 'Twitch',
    twitter: 'X / Twitter',
    facebook: 'Facebook Live',
    kick: 'Kick',
    rumble: 'Rumble',
    other: 'Custom RTMP'
};

export const DEFAULT_RTMP_URLS: Record<string, string> = {
    youtube: 'rtmp://a.rtmp.youtube.com/live2',
    twitch: 'rtmp://live.twitch.tv/app/',
    twitter: 'rtmps://live-upload.instagram.com:443/rtmp/',
    kick: 'rtmps://fa7d151a67.global-contribute.live-video.net:443/app/',
    other: ''
};

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const PLAN_LIMITS = {
    free: { label: 'Free', rtmp_destinations: 0, playlists: 1 },
    starter: { label: 'Starter', rtmp_destinations: 1, playlists: 5 },
    pro: { label: 'Pro', rtmp_destinations: 3, playlists: 15 },
    enterprise: { label: 'Enterprise', rtmp_destinations: 10, playlists: -1 }
};


// Fetch all shows
export const fetchShows = async (status: string = 'published'): Promise<Show[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shows/?status=${status}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch shows: ${response.statusText}`);
        }
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching shows:', error);
        throw error;
    }
};

// Fetch upcoming shows
export const fetchUpcomingShows = async (): Promise<Show[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shows/upcoming_shows/`);
        if (!response.ok) {
            throw new Error(`Failed to fetch upcoming shows: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching upcoming shows:', error);
        throw error;
    }
};

// User Profile Functions
export const fetchUserFollowing = async (userId: number): Promise<any[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/following/`);
        if (!response.ok) throw new Error('Failed to fetch following');
        return await response.json();
    } catch (error) {
        console.error('Error fetching following:', error);
        return [];
    }
};

// Get current authenticated user
export const getCurrentUser = async (accessToken: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/me/`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) throw new Error('Failed to fetch current user');
    return await response.json();
};

// Update user profile
export const updateUserProfile = async (
    userId: number,
    data: FormData,
    accessToken: string
): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: data
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
    }
    return await response.json();
};

// --- User Profile Functions ---

// Get user by ID
export const fetchUserById = async (userId: number | string): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}/`);
        if (!response.ok) throw new Error('User not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
    }
};

// Aliases for creator detail compatibility
export const fetchCreatorById = fetchUserById;

export const fetchCreatorByUsername = async (username: string): Promise<Creator> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/by-username/${username}/`);
        if (!response.ok) throw new Error('Creator not found');
        return await response.json();
    } catch (error) {
        console.error('Error fetching creator by username:', error);
        throw error;
    }
};




// Events Types and Functions
export interface Event {
    id: number;
    slug?: string;
    title: string;
    description: string;
    banner_image: string | null;
    thumbnail: string | null; // alias for banner_image
    start_date: string;        // frontend alias
    end_date: string | null;   // frontend alias
    start_datetime: string;    // backend field
    end_datetime: string;      // backend field
    venue_name: string;
    address: string;
    location: string | null;   // legacy
    is_virtual: boolean;
    meeting_link: string | null;
    capacity: number | null;
    registration_link: string;
    registration_deadline: string | null;
    is_public: boolean;
    is_recurring: boolean;
    recurrence_type: 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | null;
    day_of_week: number | null;
    scheduled_time: string | null;
    status: 'draft' | 'published' | 'cancelled' | 'upcoming' | 'ongoing' | 'past';
    organizer: {
        id: number;
        username: string;
        profile_picture: string | null;
    };
    like_count: number;
    comment_count: number;
    share_count: number;
    created_at: string;
    updated_at: string;
}

export const fetchEvents = async (status: string = 'published'): Promise<Event[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/events/?status=${status}`);
        if (!response.ok) throw new Error(`Failed to fetch events: ${response.statusText}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching events:', error);
        throw error;
    }
};

export const fetchUpcomingEvents = async (): Promise<Event[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/events/upcoming/`);
        if (!response.ok) throw new Error(`Failed to fetch upcoming events: ${response.statusText}`);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        throw error;
    }
};

export const fetchEventById = async (id: number | string): Promise<Event> => {
    try {
        const response = await fetch(`${API_BASE_URL}/events/${id}/`);
        if (!response.ok) throw new Error(`Failed to fetch event: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching event:', error);
        throw error;
    }
};

// Creators/Users Types and Functions
export interface Creator {
    id: number;
    username: string;
    bio: string;
    profile_picture: string | null;
    cover_photo: string | null;
    website: string | null;
    twitter?: string | null;
    instagram?: string | null;
    youtube?: string | null;
    is_verified: boolean;
    role: 'user' | 'creator';
    follower_count: number;
    following_count?: number;
}

// Creator Statistics Interface
export interface CreatorStats {
    total_views: number;
    total_shares: number;
    total_likes: number;
    total_comments: number;
    follower_count: number;
    following_count: number;
    show_count: number;
    event_count: number;
}

export const fetchCreators = async (): Promise<Creator[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/?role=creator`);
        if (!response.ok) throw new Error(`Failed to fetch creators: ${response.statusText}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching creators:', error);
        throw error;
    }
};


// News Types and Functions
export interface News {
    id: number;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    featured_image: string | null;
    category: string;
    author: {
        id: number;
        username: string;
        profile_picture: string | null;
    };
    published_at: string | null;
    is_featured: boolean;
    like_count: number;
    comment_count: number;
}

export const fetchNews = async (category?: string): Promise<News[]> => {
    try {
        const url = category
            ? `${API_BASE_URL}/news/?category=${category}`
            : `${API_BASE_URL}/news/`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch news: ${response.statusText}`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching news:', error);
        throw error;
    }
};

export const fetchNewsById = async (id: number): Promise<News> => {
    try {
        const response = await fetch(`${API_BASE_URL}/news/${id}/`);
        if (!response.ok) throw new Error(`Failed to fetch news article: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching news article:', error);
        throw error;
    }
};

// User Profile & Social Data
export interface UserProfile {
    id: number;
    username: string;
    email?: string;
    stacks_address: string;
    role: 'user' | 'creator';
    bio: string;
    profile_picture: string | null;
    cover_photo: string | null;
    website: string | null;
    twitter: string | null;
    instagram: string | null;
    youtube: string | null;
    is_verified: boolean;
    date_joined: string;
    follower_count: number;
    following_count: number;
}

export const fetchUserProfile = async (userId: number, accessToken?: string): Promise<UserProfile> => {
    try {
        const headers: HeadersInit = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}/`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch user profile: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching user profile:', error);
        throw error;
    }
};

export const getUserLikedShows = async (userId: number, accessToken?: string): Promise<Show[]> => {
    try {
        const headers: HeadersInit = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}/liked_shows/`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch liked shows: ${response.statusText}`);
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching liked shows:', error);
        throw error;
    }
};

export const fetchUserLikedEvents = async (userId: number, accessToken?: string): Promise<Event[]> => {
    try {
        const headers: HeadersInit = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/users/${userId}/liked_events/`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch liked events: ${response.statusText}`);
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching liked events:', error);
        throw error;
    }
};


export const fetchCreatorShows = async (creatorId: number, accessToken?: string, status?: string): Promise<Show[]> => {
    try {
        const headers: HeadersInit = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const statusParam = status ? `&status=${status}` : '';
        const response = await fetch(`${API_BASE_URL}/shows/?creator=${creatorId}${statusParam}`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch creator shows: ${response.statusText}`);
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching creator shows:', error);
        throw error;
    }
};

export const fetchMyShows = async (accessToken: string): Promise<Show[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shows/my_shows/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        });
        if (!response.ok) throw new Error(`Failed to fetch my shows: ${response.statusText}`);
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching my shows:', error);
        throw error;
    }
};


export const fetchCreatorEvents = async (creatorId: number, accessToken?: string): Promise<Event[]> => {
    try {
        const headers: HeadersInit = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/events/?organizer=${creatorId}`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch creator events: ${response.statusText}`);
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching creator events:', error);
        throw error;
    }
};

export const fetchMyEvents = async (accessToken: string): Promise<Event[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/events/my_events/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        });
        if (!response.ok) throw new Error(`Failed to fetch my events: ${response.statusText}`);
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching my events:', error);
        throw error;
    }
};


// Create/Update/Delete Show
export interface CreateShowPayload {
    title: string;
    description: string;
    thumbnail?: File;
    is_recurring: boolean;
    recurrence_type?: 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS';
    day_of_week?: number;
    scheduled_time?: string; // HH:MM format
    status?: 'draft' | 'published' | 'archived';
    tag_ids?: number[];
    external_link?: string;
    link_platform?: 'youtube' | 'twitter' | 'twitch' | 'rumble' | 'kick' | 'other';
    co_host_ids?: number[];
}

export const createShow = async (payload: CreateShowPayload, accessToken: string): Promise<Show> => {
    try {
        const formData = new FormData();
        formData.append('title', payload.title);
        formData.append('description', payload.description);
        formData.append('is_recurring', payload.is_recurring.toString());

        if (payload.thumbnail) {
            formData.append('thumbnail', payload.thumbnail);
        }

        if (payload.is_recurring) {
            if (payload.recurrence_type) {
                formData.append('recurrence_type', payload.recurrence_type);
            }
            if (payload.day_of_week !== undefined) {
                formData.append('day_of_week', payload.day_of_week.toString());
            }
            if (payload.scheduled_time) {
                formData.append('scheduled_time', payload.scheduled_time);
            }
        }

        if (payload.status) {
            formData.append('status', payload.status);
        }

        if (payload.tag_ids && payload.tag_ids.length > 0) {
            payload.tag_ids.forEach(id => {
                formData.append('tag_ids', id.toString());
            });
        }

        if (payload.external_link) {
            formData.append('external_link', payload.external_link);
        }

        if (payload.link_platform) {
            formData.append('link_platform', payload.link_platform);
        }

        if (payload.co_host_ids && payload.co_host_ids.length > 0) {
            payload.co_host_ids.forEach(id => {
                formData.append('co_host_ids', id.toString());
            });
        }

        const response = await fetch(`${API_BASE_URL}/shows/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to create show');
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating show:', error);
        throw error;
    }
};

export interface UpdateShowPayload {
    title?: string;
    description?: string;
    thumbnail?: File;
    is_recurring?: boolean;
    recurrence_type?: 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | null;
    day_of_week?: number | null;
    scheduled_time?: string | null;
    status?: 'draft' | 'published' | 'archived';
    tag_ids?: number[];
    external_link?: string;
    link_platform?: 'youtube' | 'twitter' | 'twitch' | 'rumble' | 'kick' | 'other';
    co_host_ids?: number[];
}

export const updateShow = async (showSlug: string, payload: UpdateShowPayload, accessToken: string): Promise<Show> => {
    try {
        const formData = new FormData();

        if (payload.title !== undefined) {
            formData.append('title', payload.title);
        }
        if (payload.description !== undefined) {
            formData.append('description', payload.description);
        }
        if (payload.is_recurring !== undefined) {
            formData.append('is_recurring', payload.is_recurring.toString());
        }
        if (payload.recurrence_type) {
            formData.append('recurrence_type', payload.recurrence_type);
        }
        if (payload.thumbnail) {
            formData.append('thumbnail', payload.thumbnail);
        }
        if (payload.day_of_week !== undefined) {
            formData.append('day_of_week', payload.day_of_week !== null ? payload.day_of_week.toString() : '');
        }
        if (payload.scheduled_time !== undefined) {
            formData.append('scheduled_time', payload.scheduled_time || '');
        }
        if (payload.status) {
            formData.append('status', payload.status);
        }
        if (payload.tag_ids !== undefined && payload.tag_ids.length > 0) {
            payload.tag_ids.forEach(id => {
                formData.append('tag_ids', id.toString());
            });
        }
        if (payload.external_link !== undefined) {
            formData.append('external_link', payload.external_link || '');
        }
        if (payload.link_platform !== undefined) {
            formData.append('link_platform', payload.link_platform || '');
        }
        if (payload.co_host_ids !== undefined) {
            payload.co_host_ids.forEach(id => {
                formData.append('co_host_ids', id.toString());
            });
        }

        const response = await fetch(`${API_BASE_URL}/shows/${showSlug}/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update show');
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating show:', error);
        throw error;
    }
};

export const deleteShow = async (showSlug: string, accessToken: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shows/${showSlug}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to delete show');
        }
    } catch (error) {
        console.error('Error deleting show:', error);
        throw error;
    }
};

// Track when a show is shared
export const trackShare = async (showSlug: string): Promise<{ success: boolean; share_count: number }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shows/${showSlug}/track_share/`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Failed to track share');
        }

        return await response.json();
    } catch (error) {
        console.error('Error tracking share:', error);
        throw error;
    }
};


// Fetch show details by slug
export const fetchShowBySlug = async (slug: string): Promise<Show> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shows/${slug}/`);

        if (!response.ok) {
            throw new Error('Show not found');
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching show:', error);
        throw error;
    }
};

// legacy function for backward compatibility (redirects to slug-based)
export const fetchShowById = async (id: number | string): Promise<Show> => {
    return fetchShowBySlug(String(id));
};

// --- Show Episodes API ---
export interface ShowEpisode {
    id: number;
    show: number;
    episode_number: number;
    title: string;
    description: string;
    air_date: string;
    duration: string | null;
    video_url: string | null;
    is_premium?: boolean;
    price_stx?: number;
    price_usdcx?: number;
    created_at?: string;
}

export const fetchEpisodes = async (showId: number): Promise<ShowEpisode[]> => {
    const response = await fetch(`${API_BASE_URL}/episodes/?show=${showId}`);
    if (!response.ok) throw new Error('Failed to fetch episodes');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.results || []);
};

export const fetchShowEpisodes = async (showSlug: string): Promise<ShowEpisode[]> => {
    const response = await fetch(`${API_BASE_URL}/shows/${showSlug}/episodes/`);
    if (!response.ok) throw new Error('Failed to fetch show episodes');
    return await response.json();
};

export const createEpisode = async (data: Partial<ShowEpisode>, token: string): Promise<ShowEpisode> => {
    const response = await fetch(`${API_BASE_URL}/episodes/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to create episode');
    return response.json();
};

export const updateEpisode = async (id: number, data: Partial<ShowEpisode>, token: string): Promise<ShowEpisode> => {
    const response = await fetch(`${API_BASE_URL}/episodes/${id}/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update episode');
    return response.json();
};

export const deleteEpisode = async (id: number, token: string): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/episodes/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete episode');
};

// Fetch show by numeric PK (for notification routing where we only have the ID)
// Since ShowViewSet uses slug as lookup_field, we can't use /shows/{pk}/
// Instead, get all shows and find by ID client-side (not ideal but works)
export const fetchShowByPk = async (pk: number): Promise<Show | null> => {
    try {
        // Try to get the show directly by pk using the detail endpoint
        // This might work if the backend allows pk lookups even with slug as lookup_field
        const directResponse = await fetch(`${API_BASE_URL}/shows/${pk}/`);
        if (directResponse.ok) {
            return await directResponse.json();
        }

        // Fallback: fetch all shows and filter client-side
        const response = await fetch(`${API_BASE_URL}/shows/`);
        if (!response.ok) return null;
        const data = await response.json();
        const shows = data.results || data || [];
        const show = shows.find((s: Show) => s.id === pk);
        return show || null;
    } catch (error) {
        console.error('Error fetching show by PK:', error);
        return null;
    }
};


// ============================================
// SHOW & EVENT INTERACTIONS (LIKE, COMMENT)
// ============================================

export interface Comment {
    id: number;
    user: {
        id: number;
        username: string;
        profile_picture: string | null;
    };
    text: string;
    created_at: string;
    updated_at: string;
}

export interface CommentsResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Comment[];
}

// Like/Unlike Show
export const likeShow = async (showId: number, accessToken: string): Promise<{ liked: boolean; like_count: number }> => {
    const response = await fetch(`${API_BASE_URL}/shows/${showId}/like/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to like show');
    return await response.json();
};

export const unlikeShow = async (showId: number, accessToken: string): Promise<{ liked: boolean; like_count: number }> => {
    const response = await fetch(`${API_BASE_URL}/shows/${showId}/unlike/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to unlike show');
    return await response.json();
};

// Show Comments
export const getShowComments = async (showId: number, page: number = 1): Promise<CommentsResponse> => {
    const response = await fetch(`${API_BASE_URL}/shows/${showId}/comments/?page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch comments');
    return await response.json();
};

export const addShowComment = async (showId: number, text: string, accessToken: string): Promise<Comment> => {
    const response = await fetch(`${API_BASE_URL}/shows/${showId}/comment/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('Failed to add comment');
    return await response.json();
};

// Like/Unlike Event
export const likeEvent = async (eventId: number, accessToken: string): Promise<{ liked: boolean; like_count: number }> => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/like/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to like event');
    return await response.json();
};

export const unlikeEvent = async (eventId: number, accessToken: string): Promise<{ liked: boolean; like_count: number }> => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/unlike/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to unlike event');
    return await response.json();
};

// Event Comments
export const getEventComments = async (eventId: number, page: number = 1): Promise<CommentsResponse> => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/comments/?page=${page}`);
    if (!response.ok) throw new Error('Failed to fetch comments');
    return await response.json();
};

export const addEventComment = async (eventId: number, text: string, accessToken: string): Promise<Comment> => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/comment/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error('Failed to add comment');
    return await response.json();
};

// ==============================================
// GENERIC LIKE & COMMENT FUNCTIONS
// For all content types (Shows, News, Events)
// ==============================================

// Content Type IDs Cache
let CONTENT_TYPE_CACHE: { model: string; id: number }[] | null = null;

/**
 * Dynamically fetch ContentType IDs from the backend.
 * This ensures compatibility between local and production environments
 * where IDs are often different.
 */
export const getContentTypeId = async (modelName: string): Promise<number> => {
    // 1. Check cache first
    if (CONTENT_TYPE_CACHE) {
        const found = CONTENT_TYPE_CACHE.find(ct => ct.model === modelName.toLowerCase());
        if (found) return found.id;
    }

    // 2. Fetch from backend
    try {
        const response = await fetch(`${API_BASE_URL}/likes/content_types/`);
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
                CONTENT_TYPE_CACHE = data;
                const found = data.find((ct: any) => ct.model === modelName.toLowerCase());
                if (found) return found.id;
            }
        }
    } catch (error) {
        console.warn('Failed to fetch content types, falling back to defaults:', error);
    }

    // 3. Fallback to hardcoded defaults
    const fallbacks: Record<string, number> = {
        show: Number(import.meta.env.VITE_CONTENT_TYPE_SHOW || 13),
        news: Number(import.meta.env.VITE_CONTENT_TYPE_NEWS || 11),
        event: Number(import.meta.env.VITE_CONTENT_TYPE_EVENT || 12),
        post: Number(import.meta.env.VITE_CONTENT_TYPE_POST || 15),
    };

    return fallbacks[modelName.toLowerCase()] || 0;
};

export const CONTENT_TYPES = {
    SHOW: Number(import.meta.env.VITE_CONTENT_TYPE_SHOW || 13),
    NEWS: Number(import.meta.env.VITE_CONTENT_TYPE_NEWS || 11),
    EVENT: Number(import.meta.env.VITE_CONTENT_TYPE_EVENT || 12)
};

// Toggle like/unlike (works for any content type)
export const toggleLike = async (
    contentType: number | string,
    objectId: number,
    accessToken: string
): Promise<{ status: 'liked' | 'unliked'; like?: any }> => {
    const ctId = typeof contentType === 'string' 
        ? await getContentTypeId(contentType) 
        : contentType;

    const response = await fetch(`${API_BASE_URL}/likes/toggle/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content_type: ctId,
            object_id: objectId
        })
    });
    if (!response.ok) throw new Error('Failed to toggle like');
    return await response.json();
};

// Check if user has liked content
export const checkIfLiked = async (
    contentType: number | string,
    objectId: number,
    userId: number
): Promise<boolean> => {
    const ctId = typeof contentType === 'string' 
        ? await getContentTypeId(contentType) 
        : contentType;

    try {
        const response = await fetch(
            `${API_BASE_URL}/likes/?content_type=${ctId}&object_id=${objectId}&user=${userId}`
        );
        if (!response.ok) return false;
        const data = await response.json();

        // Handle both paginated and non-paginated responses
        if (Array.isArray(data)) {
            return data.length > 0;
        } else if (data.results && Array.isArray(data.results)) {
            return data.results.length > 0;
        }

        return false;
    } catch (error) {
        console.error('Error checking like status:', error);
        return false;
    }
};

// Fetch comments for any content type
export const fetchComments = async (
    contentType: number | string,
    objectId: number,
    topLevel: boolean = true,
    accessToken?: string
): Promise<Comment[]> => {
    const ctId = typeof contentType === 'string'
        ? await getContentTypeId(contentType)
        : contentType;

    try {
        const url = new URL(`${API_BASE_URL}/comments/`);
        url.searchParams.append('content_type', ctId.toString());
        url.searchParams.append('object_id', objectId.toString());
        if (topLevel) url.searchParams.append('top_level', 'true');

        const response = await fetch(url.toString(), {
            headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
        });
        if (!response.ok) throw new Error('Failed to fetch comments');
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
};

// Create a comment (works for any content type)
export const createComment = async (
    contentType: number | string,
    objectId: number,
    text: string,
    accessToken: string,
    parentId?: number
): Promise<Comment> => {
    const ctId = typeof contentType === 'string'
        ? await getContentTypeId(contentType)
        : contentType;

    const response = await fetch(`${API_BASE_URL}/comments/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content_type: ctId,
            object_id: objectId,
            text,
            parent: parentId || null
        })
    });
    if (!response.ok) throw new Error('Failed to create comment');
    return await response.json();
};

// Delete a comment
export const deleteComment = async (
    commentId: number,
    accessToken: string
): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) throw new Error('Failed to delete comment');
};

// Update a comment
export const updateComment = async (
    commentId: number,
    text: string,
    accessToken: string
): Promise<Comment> => {
    const response = await fetch(`${API_BASE_URL}/comments/${commentId}/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error('Failed to update comment');
    return await response.json();
};

// ============================================
// EVENT CRUD FUNCTIONS
// ============================================

export interface CreateEventPayload {
    title: string;
    description: string;
    banner_image?: File;
    start_datetime?: string;
    end_datetime?: string;
    venue_name?: string;
    address?: string;
    is_virtual: boolean;
    meeting_link?: string;
    capacity?: number;
    registration_link?: string;
    registration_deadline?: string;
    is_public: boolean;
    is_recurring?: boolean;
    recurrence_type?: 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS';
    day_of_week?: number;
    scheduled_time?: string;
}

export const createEvent = async (
    payload: CreateEventPayload,
    accessToken: string
): Promise<Event> => {
    const formData = new FormData();
    formData.append('title', payload.title);
    formData.append('description', payload.description);
    formData.append('is_virtual', String(payload.is_virtual));
    formData.append('is_public', String(payload.is_public));

    // Dates: only send if provided (not required for recurring events)
    if (payload.start_datetime) formData.append('start_datetime', payload.start_datetime);
    if (payload.end_datetime) formData.append('end_datetime', payload.end_datetime);

    // Recurring fields
    if (payload.is_recurring !== undefined) formData.append('is_recurring', String(payload.is_recurring));
    if (payload.recurrence_type) formData.append('recurrence_type', payload.recurrence_type);
    if (payload.day_of_week !== undefined) formData.append('day_of_week', String(payload.day_of_week));
    if (payload.scheduled_time) formData.append('scheduled_time', payload.scheduled_time);

    if (payload.banner_image) formData.append('banner_image', payload.banner_image);
    if (payload.venue_name) formData.append('venue_name', payload.venue_name);
    if (payload.address) formData.append('address', payload.address);
    if (payload.meeting_link) formData.append('meeting_link', payload.meeting_link);
    if (payload.capacity) formData.append('capacity', String(payload.capacity));
    if (payload.registration_link) formData.append('registration_link', payload.registration_link);
    if (payload.registration_deadline) formData.append('registration_deadline', payload.registration_deadline);

    const response = await fetch(`${API_BASE_URL}/events/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to create event');
    }
    return await response.json();
};

export interface UpdateEventPayload {
    title?: string;
    description?: string;
    banner_image?: File;
    start_datetime?: string;
    end_datetime?: string;
    venue_name?: string;
    address?: string;
    is_virtual?: boolean;
    meeting_link?: string;
    capacity?: number | null;
    registration_link?: string;
    registration_deadline?: string | null;
    is_public?: boolean;
    is_recurring?: boolean;
    recurrence_type?: 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS';
    day_of_week?: number;
    scheduled_time?: string;
}

export const updateEvent = async (
    eventId: number,
    payload: UpdateEventPayload,
    accessToken: string
): Promise<Event> => {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (value instanceof File) {
                formData.append(key, value);
            } else {
                formData.append(key, String(value));
            }
        }
    });

    const response = await fetch(`${API_BASE_URL}/events/${eventId}/`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Failed to update event');
    }
    return await response.json();
};

export const deleteEvent = async (
    eventId: number,
    accessToken: string
): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/events/${eventId}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error('Failed to delete event');
};

export const trackEventShare = async (eventId: number): Promise<{ success: boolean }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/track_share/`, {
            method: 'POST',
        });
        return await response.json();
    } catch (error) {
        console.error('Error tracking event share:', error);
        return { success: false };
    }
};

// ============================================
// FEEDBACK FUNCTION
// ============================================

export const submitFeedback = async (
    category: 'bug' | 'feature' | 'general',
    message: string,
    userIdentifier?: string
): Promise<{ success: boolean; message: string }> => {
    const response = await fetch(`${API_BASE_URL}/feedback/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            category,
            message,
            user_identifier: userIdentifier || 'anonymous'
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to submit feedback' }));
        throw new Error(error.error || 'Failed to submit feedback');
    }

    return await response.json();
};

// ============================================
// FOLLOW FUNCTIONS
// ============================================

export interface Follow {
    id: number;
    follower: {
        id: number;
        username: string;
        profile_picture: string | null;
        role?: string;
        is_verified?: boolean;
        bio?: string | null;
        follower_count?: number;
    };
    following: {
        id: number;
        username: string;
        profile_picture: string | null;
        role?: string;
        is_verified?: boolean;
        bio?: string | null;
        follower_count?: number;
    };
    created_at: string;
}

// Toggle follow/unfollow a user
export const toggleFollow = async (
    userId: number,
    accessToken: string
): Promise<{ status: 'followed' | 'unfollowed' }> => {
    const response = await fetch(`${API_BASE_URL}/follows/toggle/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            following_id: userId
        })
    });
    if (!response.ok) throw new Error('Failed to toggle follow');
    return await response.json();
};

// Check if current user is following a specific user
export const checkIsFollowing = async (
    userId: number,
    currentUserId: number,
    accessToken: string
): Promise<boolean> => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/follows/?follower=${currentUserId}&following=${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                }
            }
        );
        if (!response.ok) return false;
        const data = await response.json();

        // Handle both paginated and non-paginated responses
        if (Array.isArray(data)) {
            return data.length > 0;
        } else if (data.results && Array.isArray(data.results)) {
            return data.results.length > 0;
        }

        return false;
    } catch (error) {
        console.error('Error checking follow status:', error);
        return false;
    }
};

// Fetch followers of a user
export const fetchFollowers = async (
    userId: number,
    accessToken?: string
): Promise<Follow[]> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(
        `${API_BASE_URL}/follows/followers/?user_id=${userId}`,
        { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch followers');
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
};

// Fetch users that a user is following
export const fetchFollowing = async (
    userId: number,
    accessToken?: string
): Promise<Follow[]> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

    const response = await fetch(
        `${API_BASE_URL}/follows/following/?user_id=${userId}`,
        { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch following');
    const data = await response.json();
    return Array.isArray(data) ? data : data.results || [];
};

// ============================================
// NOTIFICATION FUNCTIONS
// ============================================

export interface NotificationResponse {
    id: number;
    recipient: number;
    actor: {
        id: number;
        username: string;
        profile_picture: string | null;
    };
    notification_type: 'follow' | 'like' | 'comment' | 'share' | 'show_reminder' | 'show_cancelled' | 'guest_request' | 'guest_accepted' | 'guest_declined' | 'co_host_added';
    content_type: number | null;
    object_id: number | null;
    message?: string;
    is_read: boolean;
    created_at: string;
}

// Fetch user's notifications
export const fetchNotifications = async (
    accessToken: string
): Promise<Notification[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            }
        });
        if (!response.ok) throw new Error('Failed to fetch notifications');
        const data = await response.json();

        // Handle DRF pagination format
        if (Array.isArray(data)) {
            return data;
        } else if (data.results && Array.isArray(data.results)) {
            return data.results;
        }

        console.warn('Unexpected notifications response format:', data);
        return [];
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
};

// Mark a notification as read
export const markNotificationRead = async (
    notificationId: number,
    accessToken: string
): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/mark_read/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) throw new Error('Failed to mark notification as read');
};

// Mark all notifications as read
export const markAllNotificationsRead = async (
    accessToken: string
): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/notifications/mark_all_read/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });
    if (!response.ok) throw new Error('Failed to mark all notifications as read');
};
// Tag API Functions
export const fetchTags = async (): Promise<Tag[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/tags/`);
        if (!response.ok) throw new Error('Failed to fetch tags');
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching tags:', error);
        return [];
    }
};

export const searchTags = async (query: string): Promise<Tag[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/tags/?search=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Failed to search tags');
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error searching tags:', error);
        return [];
    }
};

// Search Functions
export const searchShows = async (query: string, tagIds?: number[]): Promise<Show[]> => {
    try {
        let url = `${API_BASE_URL}/shows/?search=${encodeURIComponent(query)}&status=published`;

        if (tagIds && tagIds.length > 0) {
            url += `&tags=${tagIds.join(',')}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to search shows');
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error searching shows:', error);
        return [];
    }
};

export const searchCreators = async (query: string): Promise<User[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/?search=${encodeURIComponent(query)}&role=creator`);
        if (!response.ok) throw new Error('Failed to search creators');
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error searching creators:', error);
        return [];
    }
};

// Show Reminder Functions
export const respondToReminder = async (
    showId: number,
    scheduledFor: string,
    response: 'confirmed' | 'cancelled',
    accessToken: string
): Promise<ShowReminder> => {
    try {
        const res = await fetch(`${API_BASE_URL}/shows/${showId}/respond_to_reminder/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scheduled_for: scheduledFor,
                response: response,
            }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to respond to reminder');
        }
        return await res.json();
    } catch (error) {
        console.error('Error responding to reminder:', error);
        throw error;
    }
};

export const fetchUpcomingInstances = async (showId: number, accessToken: string): Promise<ShowInstance[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/shows/${showId}/upcoming_instances/`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) throw new Error('Failed to fetch upcoming instances');
        return await response.json();
    } catch (error) {
        console.error('Error fetching upcoming instances:', error);
        return [];
    }
};


// ============================================================================
// Guest Request Functions
// ============================================================================

export const createGuestRequest = async (
    showId: number,
    message: string,
    accessToken: string
): Promise<GuestRequest> => {
    const response = await fetch(`${API_BASE_URL}/guest-requests/create_request/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ show_id: showId, message })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create guest request');
    }

    return await response.json();
};

export const getReceivedGuestRequests = async (accessToken: string): Promise<GuestRequest[]> => {
    const response = await fetch(`${API_BASE_URL}/guest-requests/?received=true`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });

    if (!response.ok) throw new Error('Failed to fetch received guest requests');

    const data = await response.json();
    return data.results || data || [];
};

export const getSentGuestRequests = async (accessToken: string): Promise<GuestRequest[]> => {
    const response = await fetch(`${API_BASE_URL}/guest-requests/`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        }
    });

    if (!response.ok) throw new Error('Failed to fetch sent guest requests');

    const data = await response.json();
    return data.results || data || [];
};

// Check if user has already sent a request for this show
export const checkExistingGuestRequest = async (showId: number, token: string): Promise<boolean> => {
    try {
        const requests = await getSentGuestRequests(token);
        return requests.some(r => r.show.id === showId && r.status === 'pending');
    } catch (error) {
        console.error('Failed to check existing request:', error);
        return false;
    }
};


export const acceptGuestRequest = async (requestId: number, accessToken: string): Promise<GuestRequest> => {
    const response = await fetch(`${API_BASE_URL}/guest-requests/${requestId}/accept/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept guest request');
    }

    return await response.json();
};

export const declineGuestRequest = async (requestId: number, accessToken: string): Promise<GuestRequest> => {
    const response = await fetch(`${API_BASE_URL}/guest-requests/${requestId}/decline/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline guest request');
    }

    return await response.json();
};

// --- Community Posts ---

export interface CreatorPost {
    id: number;
    author: {
        id: number;
        username: string;
        profile_image?: string;
    };
    content: string;
    image?: string;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
    like_count: number;
    comment_count: number;
    user_has_liked: boolean;
    is_premium: boolean;
    price_stx: string;
    price_usdcx: string;
}

export const fetchPosts = async (params: { author?: number; page?: number } = {}, accessToken?: string): Promise<any> => {
    try {
        const headers: HeadersInit = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const queryParams = new URLSearchParams();
        if (params.author) queryParams.append('author', params.author.toString());
        if (params.page) queryParams.append('page', params.page.toString());

        const { response } = await x402Fetch(`${API_BASE_URL}/posts/?${queryParams.toString()}`, { headers });
        if (!response.ok) throw new Error(`Failed to fetch posts: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching posts:', error);
        throw error;
    }
};

export const fetchPersonalizedFeed = async (accessToken: string): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/feed/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Failed to fetch feed: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching feed:', error);
        throw error;
    }
};

export const fetchMyArticles = async (accessToken: string): Promise<News[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/news/my_articles/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Failed to fetch my articles: ${response.statusText}`);
        const data = await response.json();
        return data.results || data || [];
    } catch (error) {
        console.error('Error fetching my articles:', error);
        throw error;
    }
};


export const createPost = async (formData: FormData, accessToken: string): Promise<CreatorPost> => {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });
        if (!response.ok) throw new Error(`Failed to create post: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error creating post:', error);
        throw error;
    }
};

export const updatePost = async (postId: number, formData: FormData, accessToken: string): Promise<CreatorPost> => {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
        });
        if (!response.ok) throw new Error(`Failed to update post: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error updating post:', error);
        throw error;
    }
};

export const deletePost = async (postId: number, accessToken: string): Promise<void> => {
    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`Failed to delete post: ${response.statusText}`);
    } catch (error) {
        console.error('Error deleting post:', error);
        throw error;
    }
};

export const fetchCreatorStats = async (creatorId: number, accessToken?: string): Promise<CreatorStats> => {
    try {
        const headers: HeadersInit = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(`${API_BASE_URL}/users/${creatorId}/stats/`, { headers });
        if (!response.ok) {
            console.warn('Stats endpoint not available, using minimal data');
            return {
                total_views: 0,
                total_shares: 0,
                total_likes: 0,
                total_comments: 0,
                follower_count: 0,
                following_count: 0,
                show_count: 0,
                event_count: 0,
            };
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching creator stats:', error);
        return {
            total_views: 0,
            total_shares: 0,
            total_likes: 0,
            total_comments: 0,
            follower_count: 0,
            following_count: 0,
            show_count: 0,
            event_count: 0,
        };
    }
};

// --- Messaging & Threads ---

export interface Thread {
    id: number;
    participants: {
        id: number;
        username: string;
        profile_picture?: string;
    }[];
    created_at: string;
    is_paygated: boolean;
    price_stx: string;
    price_usdcx: string;
    last_message?: Message;
    last_message_at?: string;
    unread_count: number;
}

export interface Message {
    id: number;
    thread: number;
    sender: {
        id: number;
        username: string;
        profile_picture?: string;
    };
    body: string;
    sent_at: string;
}

export const fetchThreads = async (accessToken: string): Promise<Thread[]> => {
    try {
        const { response } = await x402Fetch(`${API_BASE_URL}/messages/threads/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch threads');
        const data = await response.json();
        return data.results || data;
    } catch (error) {
        console.error('Error fetching threads:', error);
        throw error;
    }
};

export const fetchMessages = async (threadId: number, accessToken: string): Promise<Message[]> => {
    try {
        const { response } = await x402Fetch(`${API_BASE_URL}/messages/threads/${threadId}/messages/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch messages');
        const data = await response.json();
        return data.results || data;
    } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
    }
};

export const sendMessage = async (threadId: number, body: string, accessToken: string): Promise<Message> => {
    try {
        const response = await fetch(`${API_BASE_URL}/messages/threads/${threadId}/messages/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body })
        });
        if (!response.ok) throw new Error('Failed to send message');
        return await response.json();
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// --- Merch & Orders (Added back) ---

export const fetchOrders = async (token: string): Promise<Order[]> => {
    const resp = await fetch(`${API_BASE_URL}/orders/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch orders');
    const data = await resp.json();
    return Array.isArray(data) ? data : data.results || [];
};

export const createOrder = async (data: Partial<Order>, token: string, options?: Partial<X402PaymentOptions>): Promise<Order & { tx_id?: string }> => {
    const { response, txId } = await x402Fetch(`${API_BASE_URL}/orders/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }, options);
    if (!response.ok) throw new Error('Failed to create order');
    const result = await response.json();
    return { ...result, tx_id: txId || result.tx_id };
};

export const createMerchOrder = createOrder;

export const fetchMerchList = async (creatorId?: number): Promise<Merch[]> => {
    const url = creatorId ? `${API_BASE_URL}/merch/?creator=${creatorId}` : `${API_BASE_URL}/merch/`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch merch');
    const data = await resp.json();
    return Array.isArray(data) ? data : data.results || [];
};

export const fetchCreatorMerchAdmin = async (accessToken: string): Promise<Merch[]> => {
    const resp = await fetch(`${API_BASE_URL}/merch/my_merch/`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch admin merch');
    const data = await resp.json();
    return Array.isArray(data) ? data : data.results || [];
};

export const createMerchItem = async (formData: FormData, accessToken: string): Promise<Merch> => {
    const resp = await fetch(`${API_BASE_URL}/merch/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: formData
    });
    if (!resp.ok) throw new Error('Failed to create merch item');
    return resp.json();
};

export const updateMerchItem = async (merchSlug: string, formData: FormData, accessToken: string): Promise<Merch> => {
    const resp = await fetch(`${API_BASE_URL}/merch/${merchSlug}/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        },
        body: formData
    });
    if (!resp.ok) throw new Error('Failed to update merch item');
    return resp.json();
};

export const deleteMerchItem = async (merchSlug: string, accessToken: string): Promise<void> => {
    const resp = await fetch(`${API_BASE_URL}/merch/${merchSlug}/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    if (!resp.ok) throw new Error('Failed to delete merch item');
};
// --- Playout Engine (DCPE) API ---

export const dcpeHealth = async (token: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/health/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return resp.json();
};

export const dcpeStatus = async (token: string): Promise<DCPEStatus> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/status/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch DCPE status');
    return resp.json();
};

export const dcpePlaylists = async (token: string): Promise<{ playlists: DCPEPlaylist[] }> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/playlists/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch playlists');
    return resp.json();
};

export const dcpeSetPlaylist = async (playlistId: string, token: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/set-playlist/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ playlist_id: playlistId })
    });
    if (!resp.ok) throw new Error('Failed to set playlist');
    return resp.json();
};

export const dcpeAdvance = async (token: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/advance/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to advance content');
    return resp.json();
};

export const dcpeStreamStart = async (token: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/stream-start/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to start stream');
    return resp.json();
};

export const dcpeStreamStop = async (token: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/stream-stop/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to stop stream');
    return resp.json();
};

export const dcpeCreateFolder = async (name: string, token: string, label?: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/create-folder/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folder: name, label: label || name })
    });
    if (!resp.ok) throw new Error('Failed to create folder');
    return resp.json();
};

export const dcpeUpload = async (files: File[], token: string, folder?: string): Promise<any> => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (folder) formData.append('folder', folder);
    
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/upload/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    if (!resp.ok) throw new Error('Failed to upload files');
    return resp.json();
};

export const dcpeSetPlaylistOrder = async (folders: string[], token: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/set-playlist-order/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ folders })
    });
    if (!resp.ok) throw new Error('Failed to set playlist order');
    return resp.json();
};
// --- Creator Studio DCPE API ---

const dcpeCreatorBase = () => `${API_BASE_URL.replace('/api', '')}/ops/dcpe`;

export interface CreatorUploadResult {
    file_id: string;
    session_id: string;
    filename: string;
    status: 'uploaded';
    credits_deducted?: number;
    new_balance?: number;
}

export class InsufficientCreditsError extends Error {
    balance: number;
    required: number;
    constructor(balance: number, required: number) {
        super(`Insufficient DAP credits. Have ${balance}, need ${required}.`);
        this.name = 'InsufficientCreditsError';
        this.balance = balance;
        this.required = required;
    }
}

export interface CreatorPrepResult {
    prep_id: string;
    folder_slug: string;
    status: 'processing';
}

export interface CreatorPrepFileStatus {
    file_id: string;
    filename: string;
    status: 'queued' | 'normalizing' | 'ready' | 'error';
    error?: string;
}

export interface CreatorPrepStatus {
    prep_id: string;
    status: 'processing' | 'ready' | 'partial' | 'error';
    folder_slug: string;
    files: CreatorPrepFileStatus[];
}

export const dcpeCreatorUpload = async (
    file: File,
    token: string,
    sessionId?: string
): Promise<CreatorUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);
    const resp = await fetch(`${dcpeCreatorBase()}/upload/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
    });
    if (resp.status === 402) {
        const err = await resp.json().catch(() => ({}));
        throw new InsufficientCreditsError(err.balance ?? 0, err.required ?? 100);
    }
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed: ${resp.status}`);
    }
    return resp.json();
};

export const dcpeCreatorPrep = async (
    fileIds: string[],
    token: string
): Promise<CreatorPrepResult> => {
    const resp = await fetch(`${dcpeCreatorBase()}/prep/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_ids: fileIds }),
    });
    if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Prep failed: ${resp.status}`);
    }
    return resp.json();
};

export const dcpeCreatorPrepStatus = async (
    prepId: string,
    token: string
): Promise<CreatorPrepStatus> => {
    const resp = await fetch(`${dcpeCreatorBase()}/prep-status/${prepId}/`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Prep status fetch failed: ${resp.status}`);
    return resp.json();
};

export const dcpeCreatorSetPlaylist = async (
    playlistId: string,
    token: string
): Promise<any> => {
    const resp = await fetch(`${dcpeCreatorBase()}/set-playlist/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist_id: playlistId }),
    });
    if (!resp.ok) throw new Error(`Set playlist failed: ${resp.status}`);
    return resp.json();
};

export const dcpeCreatorStreamStart = async (token: string): Promise<any> => {
    const resp = await fetch(`${dcpeCreatorBase()}/stream-start/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (resp.status === 409) {
        const data = await resp.json();
        const err: any = new Error(data.error || 'Stream in use by another creator');
        err.status = 409;
        err.session_owner_username = data.session_owner_username;
        throw err;
    }
    if (!resp.ok) throw new Error(`Stream start failed: ${resp.status}`);
    return resp.json();
};

export const dcpeCreatorStreamStop = async (token: string): Promise<any> => {
    const resp = await fetch(`${dcpeCreatorBase()}/stream-stop/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (resp.status === 403) {
        const data = await resp.json();
        const err: any = new Error(data.error || 'You do not own this stream session');
        err.status = 403;
        throw err;
    }
    if (!resp.ok) throw new Error(`Stream stop failed: ${resp.status}`);
    return resp.json();
};

export const adminDcpeKill = async (token: string): Promise<any> => {
    const opsBaseUrl = API_BASE_URL.replace('/api', '') + '/ops';
    const resp = await fetch(`${opsBaseUrl}/admin/dcpe/kill/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Admin kill failed: ${resp.status}`);
    return resp.json();
};

export const dcpeCreatorStatus = async (token: string): Promise<DCPEStatus> => {
    const resp = await fetch(`${dcpeCreatorBase()}/status/`, {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Status fetch failed: ${resp.status}`);
    return resp.json();
};

// --- RTMP Destinations API ---

export const fetchRTMPDestinations = async (token: string): Promise<RTMPDestination[]> => {
    const resp = await fetch(`${API_BASE_URL}/rtmp-destinations/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch RTMP destinations');
    const data = await resp.json();
    return Array.isArray(data) ? data : data.results || [];
};

export const createRTMPDestination = async (data: Partial<RTMPDestination>, token: string): Promise<RTMPDestination> => {
    const resp = await fetch(`${API_BASE_URL}/rtmp-destinations/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('Failed to create RTMP destination');
    return resp.json();
};

export const updateRTMPDestination = async (id: number, data: Partial<RTMPDestination>, token: string): Promise<RTMPDestination> => {
    const resp = await fetch(`${API_BASE_URL}/rtmp-destinations/${id}/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('Failed to update RTMP destination');
    return resp.json();
};

export const deleteRTMPDestination = async (id: number, token: string): Promise<void> => {
    const resp = await fetch(`${API_BASE_URL}/rtmp-destinations/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to delete RTMP destination');
};

// --- Broadcast Schedule API ---

export const fetchBroadcastSchedule = async (token: string): Promise<BroadcastSchedule> => {
    const resp = await fetch(`${API_BASE_URL}/broadcast-schedule/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch broadcast schedule');
    return resp.json();
};

export const updateBroadcastSchedule = async (data: Partial<BroadcastSchedule>, token: string): Promise<BroadcastSchedule> => {
    const resp = await fetch(`${API_BASE_URL}/broadcast-schedule/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('Failed to update broadcast schedule');
    return resp.json();
};

// --- Subscriptions API ---

export const fetchSubscription = async (token: string): Promise<SubscriptionData> => {
    const resp = await fetch(`${API_BASE_URL}/subscription/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch subscription');
    return resp.json();
};

// --- Subscription Upgrade (x402-gated) ---

export const upgradeSubscription = async (
    plan: string, token: string, options?: Partial<X402PaymentOptions>
): Promise<SubscriptionData & { tx_id?: string }> => {
    const { response, txId } = await x402Fetch(`${API_BASE_URL}/subscription/upgrade/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan })
    }, options);
    if (!response.ok) throw new Error('Failed to upgrade subscription');
    const result = await response.json();
    return { ...result, tx_id: txId };
};

// --- Tip API (Phase 13) ---

export interface TipPaymentInfo {
    creator_id: number;
    creator_username: string;
    creator_display_name: string;
    pay_to: string;
    profile_picture: string | null;
}

export const fetchTipPaymentInfo = async (creatorId: number, token: string): Promise<TipPaymentInfo> => {
    const resp = await fetch(`${API_BASE_URL}/tips/${creatorId}/payment-info/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch tip payment info');
    return resp.json();
};

export const sendTip = async (
    creatorId: number,
    amountStx: number,
    amountUsdcx: number,
    token: string,
    options?: Partial<X402PaymentOptions>,
    amountSbtc: number = 0
): Promise<any> => {
    const { response, txId } = await x402Fetch(`${API_BASE_URL}/tips/${creatorId}/send/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount_stx: amountStx, amount_usdcx: amountUsdcx, amount_sbtc: amountSbtc })
    }, options);
    if (!response.ok) throw new Error('Failed to send tip');
    const result = await response.json();
    return { ...result, tx_id: txId || result.tx_id };
};

// --- Merch Orders API (Phase 11) ---

export const fetchCreatorOrders = async (token: string): Promise<Order[]> => {
    const resp = await fetch(`${API_BASE_URL}/orders/mine/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('Failed to fetch creator orders');
    const data = await resp.json();
    return Array.isArray(data) ? data : data.results || [];
};

export const updateOrderStatus = async (orderId: number, newStatus: string, token: string): Promise<Order> => {
    const resp = await fetch(`${API_BASE_URL}/orders/${orderId}/update-status/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
    });
    if (!resp.ok) throw new Error('Failed to update order status');
    return resp.json();
};

// --- DM Preferences (Phase 10) ---

export interface DMPreferences {
    dm_paygate_enabled: boolean;
    dm_price_stx: number;
    dm_price_usdcx: number;
}

export const updateDMPreferences = async (data: Partial<DMPreferences>, token: string): Promise<any> => {
    const resp = await fetch(`${API_BASE_URL}/users/me/`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!resp.ok) throw new Error('Failed to update DM preferences');
    return resp.json();
};

// --- Thread helper (Phase 9) ---

export const findOrCreateThread = async (participantId: number, token: string): Promise<any> => {
    // First check if a thread already exists
    const listResp = await fetch(`${API_BASE_URL}/messages/threads/?participant=${participantId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (listResp.ok) {
        const threads = await listResp.json();
        const list = Array.isArray(threads) ? threads : threads.results || [];
        if (list.length > 0) return list[0];
    }
    // Create a new thread
    const createResp = await fetch(`${API_BASE_URL}/messages/threads/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ recipient_id: participantId })
    });
    if (!createResp.ok) throw new Error('Failed to create thread');
    return createResp.json();
};

// ============================================
// DAP CREDIT SYSTEM & CONTENT ENGINE
// ============================================

export interface DAPStatus {
    status: string;
    deposit_address: string;
    credit_rate: number;
    watcher: {
        last_poll_at: string;
        is_polling: boolean;
    };
    timestamp: string;
}

export interface DAPUser {
    id: number;
    stacks_address: string;
    memo_code: string;
    credit_balance: string;
    created_at: string;
    already_registered?: boolean;
}

export interface DAPBalance {
    stacks_address: string;
    balance: string;
    updated_at: string;
}

export interface DAPTransaction {
    id: number;
    type: 'mint' | 'deduct';
    amount: string;
    description: string;
    service_name: string;
    created_at: string;
}

export interface DAPTransactionsResponse {
    stacks_address: string;
    transactions: DAPTransaction[];
    limit: number;
    offset: number;
}

export interface ContentPackage {
    date: string;
    threadText: string;
    articleText: string;
    narrativeAngle: string;
    generatedAt: string;
    thumbnailLandscape: string | null;
    thumbnailSquare: string | null;
}

export interface ContentHistoryItem {
    runId: string;
    date: string;
    runType: string;
    generatedAt: string;
    narrativeAngle: string;
    hasThumbnail: boolean;
}

export interface RunStatus {
    running: boolean;
}

export const getDAPStatus = async (token: string): Promise<DAPStatus> => {
    const res = await fetch(`${API_BASE_URL}/dap/status/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch DAP status');
    return res.json();
};

export const registerDAP = async (token: string, stacks_address: string): Promise<DAPUser> => {
    const res = await fetch(`${API_BASE_URL}/dap/register/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stacks_address }),
    });
    if (!res.ok) throw new Error('Failed to register with DAP');
    return res.json();
};

export const getDAPBalance = async (token: string, address: string): Promise<DAPBalance> => {
    const res = await fetch(`${API_BASE_URL}/dap/balance/${address}/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch DAP balance');
    return res.json();
};

export const getDAPTransactions = async (token: string, address: string): Promise<DAPTransactionsResponse> => {
    const res = await fetch(`${API_BASE_URL}/dap/transactions/${address}/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
};

export const adminDapGrant = async (
    token: string,
    stacks_address: string,
    amount: number,
    description: string,
): Promise<{ success: boolean; new_balance: number | null; amount: number; description: string }> => {
    const res = await fetch(`${API_BASE_URL}/admin/dap/grant/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stacks_address, amount, description }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Grant failed');
    }
    return res.json();
};

export const adminDapDeduct = async (
    token: string,
    stacks_address: string,
    amount: number,
    description: string,
): Promise<{ success: boolean; new_balance: number | null; amount: number; description: string }> => {
    const res = await fetch(`${API_BASE_URL}/admin/dap/deduct/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ stacks_address, amount, description }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Deduct failed');
    }
    return res.json();
};

export interface DapNotification {
    id: number;
    action: string;
    points: number;
    description: string;
    created_at: string;
}

export const getDapNotifications = async (token: string): Promise<DapNotification[]> => {
    try {
        const res = await fetch(`${API_BASE_URL}/users/dap-notifications/`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
};

export const markDapNotificationsRead = async (token: string): Promise<void> => {
    try {
        await fetch(`${API_BASE_URL}/users/dap-notifications-mark-read/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch {
        // non-fatal
    }
};

export const generateContent = async (
    token: string,
    stacks_address: string,
    service_type: 'news-package' | 'stacks-package'
): Promise<{ success: boolean; credits_deducted: number; new_balance: number; message: string }> => {
    const res = await fetch(`${API_BASE_URL}/content/generate/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stacks_address, service_type }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed to generate content');
    }
    return res.json();
};

export const getContentRunStatus = async (token: string): Promise<RunStatus> => {
    const res = await fetch(`${API_BASE_URL}/content/status/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch run status');
    return res.json();
};

export const getLatestContent = async (token: string): Promise<ContentPackage> => {
    const res = await fetch(`${API_BASE_URL}/content/latest/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch latest content');
    return res.json();
};

export const getContentHistory = async (token: string, limit = 10): Promise<ContentHistoryItem[]> => {
    const res = await fetch(`${API_BASE_URL}/content/history/?limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch content history');
    return res.json();
};

export const getContentThumbnailUrl = (date: string, format: 'landscape' | 'square' = 'landscape'): string => {
    return `${API_BASE_URL}/content/thumbnail/${date}/${format}/`;
};

// --- Stacks Wallet Balances (Hiro API) ---

export interface StacksWalletBalances {
    stx: string;       // formatted STX (e.g. "12.50")
    sbtc: string;      // formatted sBTC (e.g. "0.00012345")
    usdcx: string;     // formatted USDCx (e.g. "100.00")
}

const HIRO_API = 'https://api.hiro.so';
const SBTC_KEY  = 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token';
const USDCX_KEY = 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx::usdcx-token';

export const getStacksWalletBalances = async (address: string): Promise<StacksWalletBalances> => {
    const res = await fetch(`${HIRO_API}/extended/v1/address/${address}/balances`);
    if (!res.ok) throw new Error('Failed to fetch Stacks balances');
    const data = await res.json();

    const stxRaw   = BigInt(data?.stx?.balance ?? '0');
    const sbtcRaw  = BigInt(data?.fungible_tokens?.[SBTC_KEY]?.balance  ?? '0');
    const usdcxRaw = BigInt(data?.fungible_tokens?.[USDCX_KEY]?.balance ?? '0');

    return {
        stx:   (Number(stxRaw)   / 1_000_000).toFixed(2),
        sbtc:  (Number(sbtcRaw)  / 100_000_000).toFixed(8),
        usdcx: (Number(usdcxRaw) / 1_000_000).toFixed(2),
    };
};

// ============================================
// ADMIN — AGENT CONTROLLER & NEWS PRODUCTION
// ============================================

export interface ElioWallet {
    addresses: {
        btc: string;
        stx: string;
        taproot: string | null;
    };
    balances: {
        btc: { sats: number; btc: string; txCount: number };
        stx: { microStx: number; stx: string };
    };
}

export interface ChatResponse {
    response: {
        reply: string;
    };
}

export interface SocialAgentWallet {
    stx: { spendable: number; total: number; locked: number };
    sbtc: { sats: number; btc: number };
    usdcx: { micro: number; dollars: number };
    address: string;
    btcAddress?: string | null;
}

export interface SocialAgentStatus {
    agent: string;
    stx_address: string;
    running: boolean;
    last_run_at: string | null;
    last_run_status: string | null;
    last_error: string | null;
    last_post_ids: string | null;
    credit_balance: string;
}

export interface ElioStatus {
    agent: {
        name: string;
        btcAddress: string;
        stxAddress: string;
        registered: boolean;
        lastHeartbeat: string | null;
    };
    memory: {
        peopleCount: number;
        learningsCount: number;
        marketResponsesCount: number;
        lastUpdated: string | null;
    };
}

export interface ElioMemory {
    people: Record<string, { notes: string; last_seen: string; manually_trained?: boolean }>;
    market_research: {
        responses: { from: string; insight: string; timestamp: string }[];
        summary: string;
    };
    learnings: string[];
    last_updated: string | null;
}

export interface ElioConversation {
    timestamp: string;
    type: string;
    from: string;
    incoming: string;
    reply: string;
}

export interface ElioConversations {
    total: number;
    page: number;
    limit: number;
    conversations: ElioConversation[];
}

// --- Long Elio ---

export const getElioWallet = async (token: string): Promise<ElioWallet> => {
    const res = await fetch(`${API_BASE_URL}/agent/wallet/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Elio wallet');
    return res.json();
};

export const getElioStatus = async (token: string): Promise<ElioStatus> => {
    const res = await fetch(`${API_BASE_URL}/agent/status/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Elio status');
    return res.json();
};

export const getElioMemory = async (token: string): Promise<ElioMemory> => {
    const res = await fetch(`${API_BASE_URL}/agent/memory/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Elio memory');
    return res.json();
};

export const getElioConversations = async (token: string, page = 1): Promise<ElioConversations> => {
    const res = await fetch(`${API_BASE_URL}/agent/conversations/?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch Elio conversations');
    return res.json();
};

export const trainElio = async (
    token: string,
    type: 'learning' | 'person' | 'market',
    content: string,
    address?: string,
): Promise<{ success: boolean; type: string; content: string }> => {
    const res = await fetch(`${API_BASE_URL}/agent/train/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, content, ...(address ? { address } : {}) }),
    });
    if (!res.ok) throw new Error('Failed to train Elio');
    return res.json();
};

export const chatWithElio = async (token: string, message: string): Promise<ChatResponse> => {
    const res = await fetch(`${API_BASE_URL}/agent/chat/`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
    });
    if (!res.ok) throw new Error('Failed to chat with Elio');
    return res.json();
};

// --- Social Agent ---

export const getSocialAgentWallet = async (token: string): Promise<SocialAgentWallet> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/wallet/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch social agent wallet');
    return res.json();
};

export const getSocialAgentStatus = async (token: string): Promise<SocialAgentStatus> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/status/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch social agent status');
    return res.json();
};

export const getSocialAgentBalance = async (token: string): Promise<DAPBalance> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/balance/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch social agent balance');
    return res.json();
};

export const getSocialAgentTransactions = async (token: string): Promise<DAPTransactionsResponse> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/transactions/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch social agent transactions');
    return res.json();
};

export interface LogLine {
    timestamp: string;
    message: string;
}

export interface GabbyConfig {
    skip_content_gen: boolean;
    skip_x_post: boolean;
    skip_tips: boolean;
}

export const getSocialConfig = async (token: string): Promise<GabbyConfig> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/config/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch social agent config');
    return res.json();
};

export const updateSocialConfig = async (token: string, patch: Partial<GabbyConfig>): Promise<GabbyConfig> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/config/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Failed to update social agent config');
    return res.json();
};

export const getSocialAgentLogs = async (token: string): Promise<{ lines: LogLine[] }> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/logs/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch social agent logs');
    return res.json();
};

export interface SocialRunResult {
    status: string;
    message?: string;
    serviceType?: string;
}

export const runSocialNews = async (token: string): Promise<SocialRunResult> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/run-news/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    // 409 = already running — return the body so the caller can surface it
    if (!res.ok && res.status !== 409) throw new Error('Failed to trigger news cycle');
    return { ...(await res.json()), _status: res.status } as any;
};

export const runSocialStacks = async (token: string): Promise<SocialRunResult> => {
    const res = await fetch(`${API_BASE_URL}/agent/social/run-stacks/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok && res.status !== 409) throw new Error('Failed to trigger stacks cycle');
    return { ...(await res.json()), _status: res.status } as any;
};

// --- Public Agent Endpoints (no auth — used by /agents showcase page) ---

export const getPublicElioWallet = async (): Promise<ElioWallet> => {
    const res = await fetch(`${API_BASE_URL}/public/agent/wallet/`);
    if (!res.ok) throw new Error('Failed to fetch Elio wallet');
    return res.json();
};

export const publicChatWithElio = async (message: string): Promise<ChatResponse> => {
    const res = await fetch(`${API_BASE_URL}/public/agent/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
    });
    if (res.status === 429) {
        throw Object.assign(new Error('Rate limit reached — please wait a moment before sending another message.'), { status: 429 });
    }
    // Parse JSON safely — the server might return HTML on unexpected errors
    let data: any;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Server returned non-JSON response (HTTP ${res.status})`);
    }
    if (!res.ok) {
        throw new Error(data?.error || data?.detail || `Elio is unavailable right now (HTTP ${res.status})`);
    }
    return data;
};

// --- News Production (admin direct trigger, no DAP credits) ---

export const triggerNewsGeneration = async (
    token: string,
    runType: 'news' | 'stacks',
    operatorPrompt?: string,
    additionalLinks?: string[]
): Promise<{ running: boolean }> => {
    const endpoint = runType === 'stacks'
        ? `${API_BASE_URL}/content/generate-stacks/`
        : `${API_BASE_URL}/content/generate-admin/`;
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operatorPrompt, additionalLinks }),
    });
    if (!res.ok) throw new Error('Failed to trigger generation');
    return res.json();
};

// ─── Community Types ──────────────────────────────────────────────────────────

export interface UserSummary {
    id: number;
    username: string;
    display_name: string | null;
    profile_picture: string | null;
    is_verified: boolean;
}

export interface Community {
    id: number;
    name: string;
    slug: string;
    description: string;
    avatar: string | null;
    banner: string | null;
    tier: 'free' | 'creator' | 'pro' | 'enterprise';
    website: string | null;
    twitter: string | null;
    agent_api_url: string | null;
    created_by: number;
    created_at: string;
    updated_at: string;
    member_count: number;
    founder: UserSummary | null;
    user_membership: { id: number; role: MembershipRole; joined_at: string } | null;
    user_is_following: boolean;
}

export type MembershipRole = 'founder' | 'admin' | 'moderator' | 'member';

export interface Membership {
    id: number;
    user: UserSummary;
    community: number;
    role: MembershipRole;
    joined_at: string;
}

export interface MembershipWithCommunity {
    id: number;
    role: MembershipRole;
    joined_at: string;
    community: Community;
}

// ─── Community API Functions ──────────────────────────────────────────────────

export const getCommunities = async (
    params?: { search?: string; ordering?: string; page?: number },
    accessToken?: string
): Promise<{ count: number; results: Community[] }> => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])).toString() : '';
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${qs}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch communities');
    return res.json();
};

export const getCommunity = async (slug: string, accessToken?: string): Promise<Community> => {
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/`, { headers });
    if (!res.ok) throw new Error('Failed to fetch community');
    return res.json();
};

export const createCommunity = async (data: FormData, accessToken: string): Promise<Community> => {
    const res = await fetch(`${API_BASE_URL}/communities/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: data,
    });
    if (!res.ok) throw new Error('Failed to create community');
    return res.json();
};

export const updateCommunity = async (slug: string, data: FormData, accessToken: string): Promise<Community> => {
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: data,
    });
    if (!res.ok) throw new Error('Failed to update community');
    return res.json();
};

export const deleteCommunity = async (slug: string, accessToken: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to delete community');
};

export const getMyCommunities = async (accessToken: string): Promise<MembershipWithCommunity[]> => {
    const res = await fetch(`${API_BASE_URL}/communities/my_communities/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to fetch my communities');
    return res.json();
};

export const getCommunityFeed = async (slug: string, page = 1, accessToken?: string) => {
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/feed/?page=${page}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch community feed');
    return res.json();
};

export const getCommunityShows = async (slug: string, accessToken?: string) => {
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/shows/`, { headers });
    if (!res.ok) throw new Error('Failed to fetch community shows');
    return res.json();
};

export const getCommunityEvents = async (slug: string, accessToken?: string) => {
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/events/`, { headers });
    if (!res.ok) throw new Error('Failed to fetch community events');
    return res.json();
};

export const getCommunityMerch = async (slug: string, accessToken?: string) => {
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/merch/`, { headers });
    if (!res.ok) throw new Error('Failed to fetch community merch');
    return res.json();
};

export const getCommunityMembers = async (slug: string, accessToken?: string): Promise<Membership[]> => {
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/members/`, { headers });
    if (!res.ok) throw new Error('Failed to fetch community members');
    return res.json();
};

export const joinCommunity = async (slug: string, accessToken: string): Promise<Membership> => {
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/members/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to join community');
    return res.json();
};

export const leaveCommunity = async (slug: string, membershipId: number, accessToken: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/members/${membershipId}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to leave community');
};

export const updateMemberRole = async (
    slug: string,
    membershipId: number,
    role: MembershipRole,
    accessToken: string
): Promise<Membership> => {
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/members/${membershipId}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error('Failed to update member role');
    return res.json();
};

export const toggleCommunityFollow = async (
    slug: string,
    accessToken: string
): Promise<{ following: boolean }> => {
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/follow/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to toggle community follow');
    return res.json();
};

export const getCommunityFollowers = async (slug: string, accessToken?: string) => {
    const headers: HeadersInit = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/followers/`, { headers });
    if (!res.ok) throw new Error('Failed to fetch community followers');
    return res.json();
};
