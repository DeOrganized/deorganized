// API Configuration - Environment-aware
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

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
    external_link: string | null;
    link_platform: 'youtube' | 'twitter' | 'twitch' | 'rumble' | 'kick' | 'other' | '';
    like_count: number;
    comment_count: number;
    share_count: number;
}

export interface Notification {
    id: number;
    notification_type: 'follow' | 'like' | 'comment' | 'share' | 'show_reminder' | 'show_cancelled' | 'guest_request' | 'guest_accepted' | 'guest_declined';
    message?: string;
    is_read: boolean;
    read?: boolean;
    created_at: string;
    show_slug?: string;
    show_title?: string;
    content_type?: number | null;
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



// Events Types and Functions
export interface Event {
    id: number;
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

export const fetchEventById = async (id: number): Promise<Event> => {
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
    is_verified: boolean;
    role: 'user' | 'creator';
    follower_count: number;
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

export const fetchCreatorById = async (id: number): Promise<Creator> => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${id}/`);
        if (!response.ok) throw new Error(`Failed to fetch creator: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching creator:', error);
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

// Creator-specific data
export interface CreatorStats {
    total_views: number;
    total_likes: number;
    total_comments: number;
    follower_count: number;
    following_count: number;
    show_count: number;
    event_count: number;
}

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

// Legacy function for backward compatibility (redirects to slug-based)
export const fetchShowById = async (id: number | string): Promise<Show> => {
    return fetchShowBySlug(String(id));
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

// Content Type IDs (from Django ContentType model)
// These map to the content types in the backend
export const CONTENT_TYPES = {
    SHOW: Number(import.meta.env.VITE_CONTENT_TYPE_SHOW || 13),    // ContentType ID for Show model
    NEWS: Number(import.meta.env.VITE_CONTENT_TYPE_NEWS || 11),    // ContentType ID for News model
    EVENT: Number(import.meta.env.VITE_CONTENT_TYPE_EVENT || 12)   // ContentType ID for Event model
};

// Toggle like/unlike (works for any content type)
export const toggleLike = async (
    contentType: number,
    objectId: number,
    accessToken: string
): Promise<{ status: 'liked' | 'unliked' }> => {
    const response = await fetch(`${API_BASE_URL}/likes/toggle/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content_type: contentType,
            object_id: objectId
        })
    });
    if (!response.ok) throw new Error('Failed to toggle like');
    return await response.json();
};

// Check if user has liked content
export const checkIfLiked = async (
    contentType: number,
    objectId: number,
    userId: number
): Promise<boolean> => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/likes/?content_type=${contentType}&object_id=${objectId}&user=${userId}`
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
    contentType: number,
    objectId: number,
    topLevel: boolean = true,
    accessToken?: string
): Promise<Comment[]> => {
    try {
        const url = topLevel
            ? `${API_BASE_URL}/comments/?content_type=${contentType}&object_id=${objectId}&top_level=true`
            : `${API_BASE_URL}/comments/?content_type=${contentType}&object_id=${objectId}`;

        const headers: Record<string, string> = {};
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const response = await fetch(url, { headers });
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
    contentType: number,
    objectId: number,
    text: string,
    accessToken: string,
    parentId?: number
): Promise<Comment> => {
    const response = await fetch(`${API_BASE_URL}/comments/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            content_type: contentType,
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
    };
    following: {
        id: number;
        username: string;
        profile_picture: string | null;
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
    notification_type: 'follow' | 'like' | 'comment' | 'share' | 'show_reminder' | 'show_cancelled' | 'guest_request' | 'guest_accepted' | 'guest_declined';
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

