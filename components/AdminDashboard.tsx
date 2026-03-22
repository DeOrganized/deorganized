import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Radio, Calendar, Newspaper, MessageSquare, Heart,
    UserPlus, TrendingUp, Shield, CheckCircle, XCircle,
    Search, ChevronLeft, ChevronRight, AlertCircle,
    BarChart3, Eye, Clock, Filter, RefreshCw, Star,
    ShoppingBag, Send, Zap, Settings, Layout, Globe, Bot, X, ExternalLink, Minus,
    Crown, Trash2, Link2
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { API_BASE_URL, adminDapGrant, adminDapDeduct } from '../lib/api';
import { getValidAccessToken } from '../lib/walletAuth';
import { MerchTracker } from './CreatorDashboard/MerchTracker';
import { CommunityPosts } from './CreatorDashboard/CommunityPosts';
import { PlayoutControl } from './PlayoutControl';
import { AgentController } from './AgentController';
import { NewsProductionStudio } from './NewsProductionStudio';
import { useToast } from './Toast';

// ============================================
// Types
// ============================================

interface AdminStats {
    overview: {
        total_users: number;
        total_creators: number;
        total_regular_users: number;
        total_shows: number;
        total_events: number;
        total_news: number;
    };
    activity: {
        new_users_7d: number;
        new_users_30d: number;
        total_likes: number;
        total_comments: number;
        total_follows: number;
    };
    feedback: {
        total: number;
        unresolved: number;
    };
    recent_users: AdminUser[];
}

interface AdminUser {
    id: number;
    username: string;
    profile_picture?: string;
    role: string;
    is_verified: boolean;
    is_staff: boolean;
    is_active: boolean;
    is_creator: boolean;
    follower_count: number;
    bio?: string;
    stacks_address?: string;
    date_joined: string;
}

interface FeedbackItem {
    id: number;
    category: string;
    message: string;
    user_identifier: string;
    resolved: boolean;
    admin_notes: string;
    created_at: string;
}

interface PaginatedResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

interface AdminCommunity {
    id: number;
    name: string;
    slug: string;
    tier: string;
    member_count: number;
    post_count: number;
    show_count: number;
    founder: { id: number; username: string; profile_picture?: string } | null;
    created_at: string;
}

interface CommunityAdminStats {
    total_communities: number;
    total_memberships: number;
    communities_this_week: number;
    most_active: { name: string; slug: string; post_count: number } | null;
}

interface LTPartner {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    status: string;
    category: string | null;
    default_url: string;
    description: string | null;
    logo_url: string | null;
    website: string | null;
    twitter: string | null;
    discord: string | null;
    telegram: string | null;
    github: string | null;
    community_page_url: string | null;
    notes: string | null;
    link_count: number;
    total_clicks: number;
    contact_count: number;
    product_count: number;
    campaign_count: number;
    created_at: string;
    contacts?: LTContact[];
    products?: LTProduct[];
    campaigns?: LTCampaign[];
}

interface LTLink {
    id: number;
    shortcode: string;
    tracked_url: string;
    partner_id: number;
    partner_name: string;
    partner_slug: string;
    destination_url: string | null;
    surface: string;
    is_active: boolean;
    campaign: string | null;
    source_ref: string | null;
    label: string | null;
    click_count: number;
    campaigns: { id: number; name: string }[];
    created_at: string;
}

interface LTKey {
    id: number;
    name: string;
    scope: string;
    partner_id: number | null;
    partner_name: string | null;
    key_prefix: string;
    last_used_at: string | null;
    created_at: string;
}

interface LTGroupedRow {
    group_key: string;
    group_label: string;
    partner_name?: string;
    partner_slug?: string;
    surface?: string;
    total_clicks: number;
}

interface LTLinkStats {
    shortcode: string;
    total_clicks: number;
    unique_ips: number;
    clicks_by_country: Record<string, number>;
    clicks_by_day: { date: string; count: number }[];
}

interface LTCampaign {
    id: number;
    name: string;
    partner_id: number;
    partner_name: string;
    description: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    link_count: number;
    total_clicks: number;
    created_at: string;
}

interface LTContact {
    id: number;
    partner_id: number;
    name: string;
    role: string | null;
    email: string | null;
    twitter: string | null;
    telegram: string | null;
    notes: string | null;
    is_primary: boolean;
    created_at: string;
}

interface LTProduct {
    id: number;
    partner_id: number;
    name: string;
    description: string | null;
    url: string | null;
    created_at: string;
}

// Surface type groups for dropdown
const SURFACE_GROUPS = [
    { label: 'Pipeline', options: ['elio-article', 'elio-thread'] },
    { label: 'YouTube', options: ['youtube-desc', 'youtube-comment'] },
    { label: 'X / Twitter', options: ['x-post', 'x-reply'] },
    { label: 'Platform', options: ['app', 'platform', 'product', 'service', 'community-page', 'community-post'] },
    { label: 'Marketing', options: ['marketing', 'newsletter', 'contest', 'landing-page'] },
    { label: 'Other', options: ['bio', 'website', 'manual', 'other'] },
] as const;

const PARTNER_CATEGORIES = ['defi', 'infrastructure', 'identity', 'bridge', 'wallet', 'community', 'stacking', 'other'] as const;

// ============================================
// API Functions
// ============================================

async function fetchAdminStats(): Promise<AdminStats> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE_URL}/users/admin-stats/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch stats: ${res.status}`);
    return res.json();
}

async function fetchAdminUsers(params: {
    search?: string;
    role?: string;
    page?: number;
}): Promise<PaginatedResponse<AdminUser>> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');

    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.role) searchParams.set('role', params.role);
    if (params.page) searchParams.set('page', String(params.page));

    const res = await fetch(`${API_BASE_URL}/users/admin-users/?${searchParams}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
    return res.json();
}

async function toggleUserVerification(userId: number): Promise<{ is_verified: boolean }> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE_URL}/users/${userId}/toggle-verification/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to toggle verification: ${res.status}`);
    return res.json();
}

async function setUserPermissions(userId: number, perms: {
    role?: string;
    is_verified?: boolean;
    is_staff?: boolean;
    is_active?: boolean;
}): Promise<AdminUser> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE_URL}/users/${userId}/set-permissions/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(perms),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed: ${res.status}`);
    }
    return res.json();
}

async function fetchAllFeedback(page = 1): Promise<PaginatedResponse<FeedbackItem>> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE_URL}/feedback/?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch feedback: ${res.status}`);
    return res.json();
}

async function updateFeedback(
    id: number,
    data: { resolved?: boolean; admin_notes?: string }
): Promise<FeedbackItem> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch(`${API_BASE_URL}/feedback/${id}/`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update feedback: ${res.status}`);
    return res.json();
}

async function fetchAdminCommunities(ordering = '-member_count_annotated'): Promise<PaginatedResponse<AdminCommunity>> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE_URL}/communities/?ordering=${ordering}&page_size=200`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch communities: ${res.status}`);
    return res.json();
}

async function fetchCommunityAdminStats(): Promise<CommunityAdminStats> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE_URL}/communities/admin_stats/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to fetch community stats: ${res.status}`);
    return res.json();
}

async function patchCommunityTier(slug: string, tier: string): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
    });
    if (!res.ok) throw new Error(`Failed to update tier: ${res.status}`);
}

async function deleteCommunityAdmin(slug: string): Promise<void> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE_URL}/communities/${slug}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to delete community: ${res.status}`);
}

// ── Link Tracker API helpers ──────────────────────────────────────────────────

function daysAgoISO(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

async function ltFetch(path: string, init: RequestInit = {}): Promise<any> {
    const token = await getValidAccessToken();
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE_URL}/link-tracker/${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers as object | undefined) },
    });
    if (res.status === 204) return null;
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || data?.detail || `Request failed: ${res.status}`);
    return data;
}

const fetchLTPartners = () => ltFetch('partners/');
const createLTPartner = (body: object) => ltFetch('partners/', { method: 'POST', body: JSON.stringify(body) });
const updateLTPartner = (id: number, body: object) => ltFetch(`partners/${id}/`, { method: 'PUT', body: JSON.stringify(body) });
const deleteLTPartner = (id: number) => ltFetch(`partners/${id}/`, { method: 'DELETE' });

const fetchLTLinks = (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return ltFetch(`links/${qs ? '?' + qs : ''}`);
};
const createLTLink = (body: object) => ltFetch('links/', { method: 'POST', body: JSON.stringify(body) });
const fetchLTLinkStats = (shortcode: string) => ltFetch(`links/${shortcode}/stats/`);

const fetchLTAnalytics = (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return ltFetch(`analytics/${qs ? '?' + qs : ''}`);
};

const fetchLTKeys = () => ltFetch('keys/');
const createLTKey = (body: object) => ltFetch('keys/', { method: 'POST', body: JSON.stringify(body) });
const deleteLTKey = (id: number) => ltFetch(`keys/${id}/`, { method: 'DELETE' });

const fetchLTPartnerDetail = (id: number) => ltFetch(`partners/${id}/`);
const fetchLTLinkDetail = (id: number) => ltFetch(`links/${id}/`);

const fetchLTCampaigns = (params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return ltFetch(`campaigns/${qs ? '?' + qs : ''}`);
};
const createLTCampaign = (body: object) => ltFetch('campaigns/', { method: 'POST', body: JSON.stringify(body) });
const updateLTCampaign = (id: number, body: object) => ltFetch(`campaigns/${id}/`, { method: 'PUT', body: JSON.stringify(body) });
const deleteLTCampaign = (id: number) => ltFetch(`campaigns/${id}/`, { method: 'DELETE' });
const fetchLTCampaignLinks = (id: number) => ltFetch(`campaigns/${id}/links/`);
const attachLTCampaignLinks = (campaignId: number, linkIds: number[]) =>
    ltFetch(`campaigns/${campaignId}/links/`, { method: 'POST', body: JSON.stringify({ link_ids: linkIds }) });
const detachLTCampaignLink = (campaignId: number, linkId: number) =>
    ltFetch(`campaigns/${campaignId}/links/${linkId}/`, { method: 'DELETE' });
const fetchLTCampaignAnalytics = (campaignId: number) => ltFetch(`campaigns/${campaignId}/analytics/`);

const fetchLTPartnerContacts = (partnerId: number) => ltFetch(`partners/${partnerId}/contacts/`);
const createLTPartnerContact = (partnerId: number, body: object) =>
    ltFetch(`partners/${partnerId}/contacts/`, { method: 'POST', body: JSON.stringify(body) });
const deleteLTPartnerContact = (partnerId: number, contactId: number) =>
    ltFetch(`partners/${partnerId}/contacts/${contactId}/`, { method: 'DELETE' });

const fetchLTPartnerProducts = (partnerId: number) => ltFetch(`partners/${partnerId}/products/`);
const createLTPartnerProduct = (partnerId: number, body: object) =>
    ltFetch(`partners/${partnerId}/products/`, { method: 'POST', body: JSON.stringify(body) });
const deleteLTPartnerProduct = (partnerId: number, productId: number) =>
    ltFetch(`partners/${partnerId}/products/${productId}/`, { method: 'DELETE' });

// ============================================
// Component
// ============================================

type AdminTab = 'overview' | 'users' | 'communities' | 'feedback' | 'playout' | 'agent-controller' | 'news-production' | 'link-tracker' | 'settings';

const ADMIN_VALID_TABS: AdminTab[] = ['overview', 'users', 'communities', 'feedback', 'playout', 'agent-controller', 'news-production', 'link-tracker', 'settings'];

function getAdminTabFromUrl(): AdminTab {
    const seg = window.location.pathname.split('/')[2];
    return ADMIN_VALID_TABS.includes(seg as AdminTab) ? (seg as AdminTab) : 'overview';
}

interface AdminDashboardProps {
    onNavigate: (page: string, id?: string | number) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
    const { backendUser } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<AdminTab>(getAdminTabFromUrl);

    const navigateToAdminTab = (tab: AdminTab) => {
        setActiveTab(tab);
        window.history.pushState({}, '', `/admin/${tab}`);
    };

    // Normalize URL on mount (/admin → /admin/overview)
    useEffect(() => {
        const seg = window.location.pathname.split('/')[2];
        if (!ADMIN_VALID_TABS.includes(seg as AdminTab)) {
            window.history.replaceState({}, '', `/admin/${activeTab}`);
        }
    }, []);

    // Sync tab on back/forward
    useEffect(() => {
        const onPopState = () => setActiveTab(getAdminTabFromUrl());
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Users tab state
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [usersCount, setUsersCount] = useState(0);
    const [usersPage, setUsersPage] = useState(1);
    const [usersSearch, setUsersSearch] = useState('');
    const [usersRoleFilter, setUsersRoleFilter] = useState('');
    const [usersLoading, setUsersLoading] = useState(false);

    // User permissions modal state
    const [managingUser, setManagingUser] = useState<AdminUser | null>(null);
    const [permRole, setPermRole] = useState('');
    const [permVerified, setPermVerified] = useState(false);
    const [permStaff, setPermStaff] = useState(false);
    const [permActive, setPermActive] = useState(true);
    const [permSaving, setPermSaving] = useState(false);

    // Grant / Deduct DAP state (inside permissions modal)
    const [grantAmount, setGrantAmount] = useState('');
    const [grantDescription, setGrantDescription] = useState('');
    const [grantSaving, setGrantSaving] = useState(false);
    const [deductSaving, setDeductSaving] = useState(false);
    const [zeroOutSaving, setZeroOutSaving] = useState(false);

    const openPermissionsModal = (user: AdminUser) => {
        setManagingUser(user);
        setPermRole(user.role);
        setPermVerified(user.is_verified);
        setPermStaff(user.is_staff);
        setPermActive(user.is_active ?? true);
    };

    const handleSavePermissions = async () => {
        if (!managingUser) return;
        setPermSaving(true);
        try {
            const updated = await setUserPermissions(managingUser.id, {
                role: permRole,
                is_verified: permVerified,
                is_staff: permStaff,
                is_active: permActive,
            });
            setUsers(prev => prev.map(u => u.id === managingUser.id ? { ...u, ...updated } : u));
            setManagingUser(null);
            toast.success(`Permissions updated for ${managingUser.username}`);
        } catch (e: any) {
            toast.error(e.message || 'Failed to update permissions');
        } finally {
            setPermSaving(false);
        }
    };

    const handleGrantDap = async () => {
        if (!managingUser?.stacks_address || !grantAmount) return;
        const amount = parseInt(grantAmount, 10);
        if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
        setGrantSaving(true);
        try {
            const token = await getValidAccessToken();
            if (!token) throw new Error('Not authenticated');
            const result = await adminDapGrant(token, managingUser.stacks_address, amount, grantDescription || 'Admin grant');
            const balMsg = result.new_balance != null ? ` · New balance: ${result.new_balance.toLocaleString()} cr` : '';
            toast.success(`Granted ${amount} DAP credits to ${managingUser.username}${balMsg}`);
            setGrantAmount('');
            setGrantDescription('');
        } catch (e: any) {
            toast.error(e.message || 'Grant failed');
        } finally {
            setGrantSaving(false);
        }
    };

    const handleDeductDap = async () => {
        if (!managingUser?.stacks_address || !grantAmount) return;
        const amount = parseInt(grantAmount, 10);
        if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
        setDeductSaving(true);
        try {
            const token = await getValidAccessToken();
            if (!token) throw new Error('Not authenticated');
            const result = await adminDapDeduct(token, managingUser.stacks_address, amount, grantDescription || 'Admin deduction');
            const balMsg = result.new_balance != null ? ` · New balance: ${result.new_balance.toLocaleString()} cr` : '';
            toast.success(`Deducted ${amount} DAP credits from ${managingUser.username}${balMsg}`);
            setGrantAmount('');
            setGrantDescription('');
        } catch (e: any) {
            toast.error(e.message || 'Deduct failed');
        } finally {
            setDeductSaving(false);
        }
    };

    const handleZeroOut = async () => {
        if (!managingUser?.stacks_address) return;
        setZeroOutSaving(true);
        try {
            const token = await getValidAccessToken();
            if (!token) throw new Error('Not authenticated');
            // Fetch current balance first
            const balRes = await fetch(`${API_BASE_URL}/dap/balance/${managingUser.stacks_address}/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!balRes.ok) throw new Error('Failed to fetch balance');
            const balData = await balRes.json();
            const balance = parseInt(balData.balance || '0', 10);
            if (balance <= 0) { toast.error('Balance is already 0'); return; }
            const result = await adminDapDeduct(token, managingUser.stacks_address, balance, 'Admin zero-out');
            toast.success(`Zeroed out ${managingUser.username} — deducted ${balance} credits · New balance: ${result.new_balance ?? 0}`);
        } catch (e: any) {
            toast.error(e.message || 'Zero-out failed');
        } finally {
            setZeroOutSaving(false);
        }
    };

    // Feedback tab state
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [feedbackCount, setFeedbackCount] = useState(0);
    const [feedbackPage, setFeedbackPage] = useState(1);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [editingNote, setEditingNote] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');

    // Communities tab state
    const [communities, setCommunities] = useState<AdminCommunity[]>([]);
    const [communityStats, setCommunityStats] = useState<CommunityAdminStats | null>(null);
    const [communitiesLoading, setCommunitiesLoading] = useState(false);
    const [communitiesSort, setCommunitiesSort] = useState('-member_count_annotated');
    const [communityToDelete, setCommunityToDelete] = useState<AdminCommunity | null>(null);
    const [deletingCommunity, setDeletingCommunity] = useState(false);
    const [updatingTierFor, setUpdatingTierFor] = useState<string | null>(null);

    // Link Tracker tab state
    const [ltSubView, setLtSubView] = useState<'dashboard' | 'partners' | 'links' | 'campaigns' | 'keys'>('dashboard');
    // Dashboard
    const [ltDashRows, setLtDashRows] = useState<LTGroupedRow[]>([]);
    const [ltDashByPartner, setLtDashByPartner] = useState<LTGroupedRow[]>([]);
    const [ltDashBySurface, setLtDashBySurface] = useState<LTGroupedRow[]>([]);
    const [ltDashSummary, setLtDashSummary] = useState<{ total_clicks: number; unique_links: number; unique_visitors: number } | null>(null);
    const [ltDashLoading, setLtDashLoading] = useState(false);
    const [ltDashDays, setLtDashDays] = useState<'7' | '30' | '90'>('30');
    const [ltDashTotal, setLtDashTotal] = useState(0);
    // Partners list
    const [ltPartners, setLtPartners] = useState<LTPartner[]>([]);
    const [ltPartnersLoading, setLtPartnersLoading] = useState(false);
    const [ltPartnerSaving, setLtPartnerSaving] = useState(false);
    const [ltAddingPartner, setLtAddingPartner] = useState(false);
    const [ltNewPartnerShowMore, setLtNewPartnerShowMore] = useState(false);
    const [ltNewPartnerForm, setLtNewPartnerForm] = useState({
        name: '', slug: '', default_url: '', category: '',
        description: '', website: '', twitter: '', discord: '',
        telegram: '', github: '', community_page_url: '', notes: '', status: 'active',
    });
    // Partner detail (inline)
    const [ltDetailPartner, setLtDetailPartner] = useState<LTPartner | null>(null);
    const [ltDetailTab, setLtDetailTab] = useState<'overview' | 'contacts' | 'products' | 'campaigns' | 'links'>('overview');
    const [ltDetailContacts, setLtDetailContacts] = useState<LTContact[]>([]);
    const [ltDetailProducts, setLtDetailProducts] = useState<LTProduct[]>([]);
    const [ltDetailCampaigns, setLtDetailCampaigns] = useState<LTCampaign[]>([]);
    const [ltDetailLinks, setLtDetailLinks] = useState<LTLink[]>([]);
    const [ltDetailLoading, setLtDetailLoading] = useState(false);
    const [ltEditingPartner, setLtEditingPartner] = useState<LTPartner | null>(null);
    const [ltPartnerEditForm, setLtPartnerEditForm] = useState<Partial<LTPartner>>({});
    // Contacts
    const [ltAddingContact, setLtAddingContact] = useState(false);
    const [ltContactSaving, setLtContactSaving] = useState(false);
    const [ltNewContactForm, setLtNewContactForm] = useState({ name: '', role: '', email: '', twitter: '', telegram: '', notes: '', is_primary: false });
    // Products
    const [ltAddingProduct, setLtAddingProduct] = useState(false);
    const [ltProductSaving, setLtProductSaving] = useState(false);
    const [ltNewProductForm, setLtNewProductForm] = useState({ name: '', description: '', url: '' });
    // Campaigns (in partner detail)
    const [ltAddingCampaign, setLtAddingCampaign] = useState(false);
    const [ltCampaignSaving, setLtCampaignSaving] = useState(false);
    const [ltNewCampaignForm, setLtNewCampaignForm] = useState({ name: '', description: '', start_date: '', end_date: '' });
    const [ltCampaignLinksModal, setLtCampaignLinksModal] = useState<{ campaign: LTCampaign; links: LTLink[] } | null>(null);
    // Campaigns tab (top-level)
    const [ltCampaigns, setLtCampaigns] = useState<LTCampaign[]>([]);
    const [ltCampaignsLoading, setLtCampaignsLoading] = useState(false);
    const [ltCampaignPartnerFilter, setLtCampaignPartnerFilter] = useState('');
    const [ltCampaignStatusFilter, setLtCampaignStatusFilter] = useState('all');
    const [ltAddingCampaignTop, setLtAddingCampaignTop] = useState(false);
    const [ltNewCampaignTopForm, setLtNewCampaignTopForm] = useState({ partner_id: '', name: '', description: '', start_date: '', end_date: '' });
    const [ltCampaignTopSaving, setLtCampaignTopSaving] = useState(false);
    // Campaign detail (inline)
    const [ltDetailCampaign, setLtDetailCampaign] = useState<any | null>(null);
    const [ltDetailCampaignLoading, setLtDetailCampaignLoading] = useState(false);
    // Attach link modal
    const [ltAttachLinkModal, setLtAttachLinkModal] = useState<LTCampaign | null>(null);
    const [ltAttachLinkSelected, setLtAttachLinkSelected] = useState<number[]>([]);
    const [ltAttachLinkSaving, setLtAttachLinkSaving] = useState(false);
    // Links list
    const [ltLinks, setLtLinks] = useState<LTLink[]>([]);
    const [ltLinksLoading, setLtLinksLoading] = useState(false);
    const [ltLinksPartnerFilter, setLtLinksPartnerFilter] = useState('');
    const [ltLinkDetailModal, setLtLinkDetailModal] = useState<any | null>(null);
    const [ltLinkDetailLoading, setLtLinkDetailLoading] = useState(false);
    const [ltLinkDetailId, setLtLinkDetailId] = useState<number | null>(null);
    const [ltAddingLink, setLtAddingLink] = useState(false);
    const [ltNewLinkResult, setLtNewLinkResult] = useState<{ tracked_url: string; shortcode: string } | null>(null);
    const [ltNewLinkForm, setLtNewLinkForm] = useState({
        partner_id: '', destination_url: '', surface: 'elio-article',
        campaign: '', source_ref: '', label: '', shortcode: '',
    });
    const [ltLinkSaving, setLtLinkSaving] = useState(false);
    // Keys
    const [ltKeys, setLtKeys] = useState<LTKey[]>([]);
    const [ltKeysLoading, setLtKeysLoading] = useState(false);
    const [ltNewKeyResult, setLtNewKeyResult] = useState<{ key: string; name: string } | null>(null);
    const [ltNewKeyForm, setLtNewKeyForm] = useState({ name: '', scope: 'read', partner_id: '' });
    const [ltKeySaving, setLtKeySaving] = useState(false);
    const [ltKeyDetailModal, setLtKeyDetailModal] = useState<LTKey | null>(null);

    const isCreator = backendUser?.role === 'creator';
    const isStaff = backendUser?.is_staff;

    // Load stats on mount (Staff only)
    useEffect(() => {
        if (isStaff) {
            loadStats();
        } else {
            setLoading(false);
        }
    }, [isStaff]);

    // Load users when tab or filters change
    useEffect(() => {
        if (activeTab === 'users' && isStaff) loadUsers();
    }, [activeTab, usersPage, usersRoleFilter, isStaff]);

    // Load feedback when tab changes
    useEffect(() => {
        if (activeTab === 'feedback' && isStaff) loadFeedback();
    }, [activeTab, feedbackPage, isStaff]);

    // Load communities when tab or sort changes
    useEffect(() => {
        if (activeTab === 'communities' && isStaff) loadCommunityData();
    }, [activeTab, communitiesSort, isStaff]);

    // Load link tracker data when tab or sub-view changes
    useEffect(() => {
        if (activeTab !== 'link-tracker' || !isStaff) return;
        if (ltSubView === 'dashboard') loadLtDashboard();
        if (ltSubView === 'partners') loadLtPartners();
        if (ltSubView === 'links') { loadLtPartners(); loadLtLinks(); }
        if (ltSubView === 'campaigns') { loadLtPartners(); loadLtCampaigns(); }
        if (ltSubView === 'keys') { loadLtPartners(); loadLtKeys(); }
    }, [activeTab, ltSubView, isStaff]);

    useEffect(() => {
        if (activeTab === 'link-tracker' && ltSubView === 'dashboard' && isStaff) loadLtDashboard();
    }, [ltDashDays]);

    useEffect(() => {
        if (activeTab === 'link-tracker' && ltSubView === 'links' && isStaff) loadLtLinks();
    }, [ltLinksPartnerFilter]);

    // Check if user has staff access
    if (!isStaff) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-inkLight mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-ink mb-2">Access Denied</h2>
                    <p className="text-inkLight">You need staff privileges to access this dashboard.</p>
                </div>
            </div>
        );
    }

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchAdminStats();
            setStats(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const data = await fetchAdminUsers({
                search: usersSearch,
                role: usersRoleFilter,
                page: usersPage,
            });
            setUsers(data.results);
            setUsersCount(data.count);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUsersLoading(false);
        }
    };

    const loadFeedback = async () => {
        setFeedbackLoading(true);
        try {
            const data = await fetchAllFeedback(feedbackPage);
            setFeedback(data.results);
            setFeedbackCount(data.count);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setFeedbackLoading(false);
        }
    };

    const loadCommunityData = async () => {
        setCommunitiesLoading(true);
        try {
            const [commData, statsData] = await Promise.all([
                fetchAdminCommunities(communitiesSort),
                fetchCommunityAdminStats(),
            ]);
            setCommunities(commData.results);
            setCommunityStats(statsData);
        } catch (err: any) {
            toast.error('Failed to load communities: ' + err.message);
        } finally {
            setCommunitiesLoading(false);
        }
    };

    const loadLtDashboard = async () => {
        setLtDashLoading(true);
        try {
            const from = daysAgoISO(parseInt(ltDashDays));
            const [summary, byPartner, bySurface, topLinks] = await Promise.all([
                fetchLTAnalytics({ from }),
                fetchLTAnalytics({ group_by: 'partner', from }),
                fetchLTAnalytics({ group_by: 'surface', from }),
                fetchLTAnalytics({ group_by: 'link', from }),
            ]);
            setLtDashSummary(summary);
            setLtDashTotal(parseInt(summary?.total_clicks) || 0);
            setLtDashByPartner(Array.isArray(byPartner) ? byPartner : []);
            setLtDashBySurface(Array.isArray(bySurface) ? bySurface : []);
            setLtDashRows(Array.isArray(topLinks) ? topLinks.slice(0, 25) : []);
        } catch (err: any) {
            toast.error('Failed to load analytics: ' + err.message);
        } finally {
            setLtDashLoading(false);
        }
    };

    const loadLtPartners = async () => {
        setLtPartnersLoading(true);
        try {
            const data = await fetchLTPartners();
            setLtPartners(Array.isArray(data) ? data : (data.partners ?? data.results ?? []));
        } catch (err: any) {
            toast.error('Failed to load partners: ' + err.message);
        } finally {
            setLtPartnersLoading(false);
        }
    };

    const loadLtLinks = async () => {
        setLtLinksLoading(true);
        try {
            const params: Record<string, string> = {};
            if (ltLinksPartnerFilter) params.partner_id = ltLinksPartnerFilter;
            const data = await fetchLTLinks(params);
            setLtLinks(Array.isArray(data) ? data : (data.links ?? data.results ?? []));
        } catch (err: any) {
            toast.error('Failed to load links: ' + err.message);
        } finally {
            setLtLinksLoading(false);
        }
    };

    const loadLtKeys = async () => {
        setLtKeysLoading(true);
        try {
            const data = await fetchLTKeys();
            setLtKeys(Array.isArray(data) ? data : (data.keys ?? data.results ?? []));
        } catch (err: any) {
            toast.error('Failed to load keys: ' + err.message);
        } finally {
            setLtKeysLoading(false);
        }
    };

    const loadLtCampaigns = async () => {
        setLtCampaignsLoading(true);
        try {
            const params: Record<string, string> = {};
            if (ltCampaignPartnerFilter) params.partner_id = ltCampaignPartnerFilter;
            const data = await fetchLTCampaigns(params);
            setLtCampaigns(Array.isArray(data) ? data : []);
        } catch (err: any) {
            toast.error('Failed to load campaigns: ' + err.message);
        } finally {
            setLtCampaignsLoading(false);
        }
    };

    const openLtCampaignDetail = async (campaign: LTCampaign) => {
        setLtDetailCampaign(campaign);
        setLtDetailCampaignLoading(true);
        try {
            const full = await ltFetch(`campaigns/${campaign.id}/`);
            setLtDetailCampaign(full);
        } catch (err: any) {
            toast.error('Failed to load campaign: ' + err.message);
        } finally {
            setLtDetailCampaignLoading(false);
        }
    };

    const openLtPartnerDetail = async (partner: LTPartner) => {
        setLtDetailPartner(partner);
        setLtDetailTab('overview');
        setLtDetailLoading(true);
        try {
            const full = await fetchLTPartnerDetail(partner.id);
            setLtDetailPartner(full);
            setLtDetailContacts(full.contacts ?? []);
            setLtDetailProducts(full.products ?? []);
            setLtDetailCampaigns(full.campaigns ?? []);
        } catch (err: any) {
            toast.error('Failed to load partner: ' + err.message);
        } finally {
            setLtDetailLoading(false);
        }
        // Also load links for this partner
        try {
            const data = await fetchLTLinks({ partner_id: String(partner.id) });
            setLtDetailLinks(Array.isArray(data) ? data : (data.results ?? []));
        } catch { /* non-fatal */ }
    };

    const handleChangeTier = async (slug: string, tier: string) => {
        setUpdatingTierFor(slug);
        try {
            await patchCommunityTier(slug, tier);
            setCommunities(prev => prev.map(c => c.slug === slug ? { ...c, tier } : c));
            toast.success('Tier updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update tier');
        } finally {
            setUpdatingTierFor(null);
        }
    };

    const handleDeleteCommunity = async () => {
        if (!communityToDelete) return;
        setDeletingCommunity(true);
        try {
            await deleteCommunityAdmin(communityToDelete.slug);
            setCommunities(prev => prev.filter(c => c.slug !== communityToDelete.slug));
            setCommunityStats(prev => prev ? { ...prev, total_communities: prev.total_communities - 1 } : prev);
            toast.success(`Deleted ${communityToDelete.name}`);
            setCommunityToDelete(null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete community');
        } finally {
            setDeletingCommunity(false);
        }
    };

    const handleToggleVerification = async (userId: number) => {
        try {
            await toggleUserVerification(userId);
            setUsers((prev) =>
                prev.map((u) => (u.id === userId ? { ...u, is_verified: !u.is_verified } : u))
            );
            if (isStaff) loadStats();
        } catch (err: any) {
            toast.error('Failed to toggle verification: ' + err.message);
        }
    };

    const handleResolveFeedback = async (id: number, resolved: boolean) => {
        try {
            await updateFeedback(id, { resolved });
            setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, resolved } : f)));
            if (isStaff) loadStats();
        } catch (err: any) {
            toast.error('Failed to update feedback: ' + err.message);
        }
    };

    const handleSaveNote = async (id: number) => {
        try {
            await updateFeedback(id, { admin_notes: noteText });
            setFeedback((prev) =>
                prev.map((f) => (f.id === id ? { ...f, admin_notes: noteText } : f))
            );
            setEditingNote(null);
            setNoteText('');
        } catch (err: any) {
            toast.error('Failed to save note: ' + err.message);
        }
    };

    const handleUserSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setUsersPage(1);
        loadUsers();
    };

    const timeAgo = (date: string) => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
        return new Date(date).toLocaleDateString();
    };

    const sidebarItems = [
        { id: 'overview' as AdminTab, label: 'Platform Stats', icon: BarChart3 },
        { id: 'users' as AdminTab, label: 'User Directory', icon: Users },
        { id: 'communities' as AdminTab, label: 'Communities', icon: Crown },
        { id: 'feedback' as AdminTab, label: 'User Feedback', icon: MessageSquare },
        { id: 'playout' as AdminTab, label: 'Playout Engine', icon: Radio },
        { id: 'agent-controller' as AdminTab, label: 'Agent Controller', icon: Bot },
        { id: 'news-production' as AdminTab, label: 'News Production', icon: Newspaper },
        { id: 'link-tracker' as AdminTab, label: 'Link Tracker', icon: Link2 },
        { id: 'settings' as AdminTab, label: 'Preferences', icon: Settings },
    ];

    if (loading && !stats) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex items-center gap-3 text-inkLight">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Loading dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-canvas flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-72 bg-surface border-r border-borderSubtle p-6 flex flex-col pt-24 md:pt-28">
                <div className="mb-8 px-2">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg shadow-gold/20">
                            <Layout className="w-6 h-6 text-ink" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-ink">Admin Suite</h2>
                            <p className="text-[10px] font-black text-gold uppercase tracking-widest">Internal</p>
                        </div>
                    </div>
                </div>

                <nav className="space-y-1.5 flex-1">
                    {sidebarItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => navigateToAdminTab(item.id)}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${
                                activeTab === item.id
                                    ? 'bg-ink text-canvas shadow-xl'
                                    : 'text-inkLight hover:text-ink hover:bg-canvas'
                            }`}
                        >
                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-gold' : ''}`} />
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-8 pt-8 border-t border-borderSubtle px-2">
                    <div className="bg-canvas border border-borderSubtle rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-inkLight uppercase tracking-wider">Storage</span>
                            <span className="text-[10px] font-black text-gold">75%</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                            <div className="h-full bg-gold-gradient w-3/4" />
                        </div>
                        <p className="text-[9px] text-inkLight text-center">Upgrade for more space</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto pt-24 md:pt-28 p-6 md:p-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto space-y-8">
                    {/* Header Section — hidden for tabs that render their own header */}
                    <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 ${
                        activeTab === 'playout' || activeTab === 'agent-controller' || activeTab === 'news-production' || activeTab === 'link-tracker' ? 'hidden' : ''
                    }`}>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-ink">
                                {sidebarItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
                            </h1>
                            <p className="text-inkLight mt-1">Manage your {activeTab} settings and analytics.</p>
                        </div>
                        <div className="flex gap-3">
                            <button className="p-3 bg-canvas border border-borderSubtle rounded-xl text-inkLight hover:text-gold transition-colors shadow-soft">
                                <Globe className="w-5 h-5" />
                            </button>
                            <button className="p-3 bg-canvas border border-borderSubtle rounded-xl text-inkLight hover:text-gold transition-colors shadow-soft">
                                <RefreshCw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3"
                        >
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                            <button onClick={() => setError(null)} className="ml-auto text-red-500">
                                <XCircle className="w-4 h-4" />
                            </button>
                        </motion.div>
                    )}

                    {/* Tab Dispatcher */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && stats && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="space-y-8"
                            >
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[
                                        { label: 'Platform Users', value: stats.overview.total_users, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { label: 'Verified Creators', value: stats.overview.total_creators, icon: Star, color: 'text-gold', bg: 'bg-orange-50' },
                                        { label: 'Live Shows', value: stats.overview.total_shows, icon: Radio, color: 'text-purple-500', bg: 'bg-purple-50' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-canvas border border-borderSubtle rounded-[2rem] p-8 shadow-soft">
                                            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
                                                <stat.icon className="w-6 h-6" />
                                            </div>
                                            <p className="text-4xl font-black text-ink">{stat.value}</p>
                                            <p className="text-sm font-bold text-inkLight mt-1">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Detailed Activity */}
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="bg-canvas border border-borderSubtle rounded-[2rem] p-8 shadow-soft space-y-6">
                                        <h3 className="text-xl font-black text-ink flex items-center gap-3">
                                            <TrendingUp className="w-6 h-6 text-gold" />
                                            Growth Analytics
                                        </h3>
                                        <div className="space-y-4">
                                            {[
                                                { label: 'New users (7d)', value: stats.activity.new_users_7d },
                                                { label: 'New users (30d)', value: stats.activity.new_users_30d },
                                                { label: 'Total likes', value: stats.activity.total_likes },
                                                { label: 'Total comments', value: stats.activity.total_comments },
                                            ].map(item => (
                                                <div key={item.label} className="flex justify-between items-center p-4 bg-surface rounded-2xl border border-borderSubtle/50">
                                                    <span className="text-sm font-bold text-inkLight">{item.label}</span>
                                                    <span className="font-black text-ink">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-canvas border border-borderSubtle rounded-[2rem] p-8 shadow-soft space-y-6">
                                        <h3 className="text-xl font-black text-ink flex items-center gap-3">
                                            <UserPlus className="w-6 h-6 text-gold" />
                                            Recent Onboardings
                                        </h3>
                                        <div className="space-y-4">
                                            {stats.recent_users.slice(0, 4).map(user => (
                                                <div key={user.id} className="flex items-center gap-4 p-3 hover:bg-surface rounded-2xl transition-colors">
                                                    <div className="w-10 h-10 rounded-full bg-surface border border-borderSubtle flex items-center justify-center font-bold text-inkLight">
                                                        {user.username[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-ink">{user.username}</p>
                                                        <p className="text-[10px] text-inkLight uppercase font-black tracking-widest">{user.role}</p>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-inkLight">
                                                        {timeAgo(user.date_joined)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'users' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
                                        <input 
                                            type="text" 
                                            value={usersSearch}
                                            onChange={(e) => setUsersSearch(e.target.value)}
                                            placeholder="Search profiles..." 
                                            className="w-full pl-12 pr-6 py-4 bg-canvas border border-borderSubtle rounded-2xl shadow-soft"
                                        />
                                    </div>
                                    <select 
                                        value={usersRoleFilter}
                                        onChange={(e) => setUsersRoleFilter(e.target.value)}
                                        className="px-6 py-4 bg-canvas border border-borderSubtle rounded-2xl font-bold text-ink shadow-soft focus:outline-none"
                                    >
                                        <option value="">All Roles</option>
                                        <option value="creator">Creators</option>
                                        <option value="user">Users</option>
                                    </select>
                                </div>
                                <div className="bg-canvas border border-borderSubtle rounded-[2rem] overflow-hidden shadow-soft">
                                    <table className="w-full text-left">
                                        <thead className="bg-surface border-b border-borderSubtle">
                                            <tr>
                                                <th className="px-8 py-4 text-xs font-black text-inkLight uppercase tracking-widest">User</th>
                                                <th className="px-8 py-4 text-xs font-black text-inkLight uppercase tracking-widest">Type</th>
                                                <th className="px-8 py-4 text-xs font-black text-inkLight uppercase tracking-widest">Status</th>
                                                <th className="px-8 py-4 text-xs font-black text-inkLight uppercase tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-borderSubtle/50">
                                            {users.map(user => (
                                                <tr
                                                    key={user.id}
                                                    className="hover:bg-surface/30 transition-colors cursor-pointer"
                                                    onClick={() => openPermissionsModal(user)}
                                                >
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-surface border border-borderSubtle flex items-center justify-center font-bold">
                                                                {user.username[0].toUpperCase()}
                                                            </div>
                                                            <span className="font-bold text-ink">{user.username}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-sm font-medium text-inkLight capitalize">{user.role}</td>
                                                    <td className="px-8 py-5">
                                                        {user.is_verified ? (
                                                            <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-lg text-[10px] font-black uppercase tracking-wider">Verified</span>
                                                        ) : (
                                                            <span className="px-3 py-1 bg-inkLight/10 text-inkLight rounded-lg text-[10px] font-black uppercase tracking-wider">Pending</span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleVerification(user.id); }}
                                                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                                                user.is_verified ? 'text-red-500 hover:bg-red-50' : 'text-gold hover:bg-gold/5'
                                                            }`}
                                                        >
                                                            {user.is_verified ? 'Revoke' : 'Verify'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'feedback' && (
                            <motion.div key="feedback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                {feedback.map(item => (
                                    <div key={item.id} className={`bg-canvas border rounded-3xl p-8 shadow-soft transition-all ${item.resolved ? 'opacity-50 grayscale' : 'border-gold/20 shadow-gold/5'}`}>
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    item.category === 'bug' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                    {item.category}
                                                </span>
                                                <span className="text-xs font-bold text-inkLight">{new Date(item.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleResolveFeedback(item.id, !item.resolved)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                                    item.resolved ? 'bg-ink text-background' : 'bg-gold-gradient text-ink'
                                                }`}
                                            >
                                                {item.resolved ? 'Reopen' : 'Mark Resolved'}
                                            </button>
                                        </div>
                                        <p className="text-lg font-medium text-ink mb-2">{item.message}</p>
                                        <p className="text-xs text-inkLight">Ticket ID: #{item.id} · From: {item.user_identifier}</p>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {activeTab === 'communities' && (
                            <motion.div key="communities" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { label: 'Total Communities', value: communityStats?.total_communities ?? '—', icon: Crown, color: 'text-gold', bg: 'bg-orange-50' },
                                        { label: 'Total Memberships', value: communityStats?.total_memberships ?? '—', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                                        { label: 'New This Week', value: communityStats?.communities_this_week ?? '—', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
                                        { label: 'Most Active', value: communityStats?.most_active?.name ?? 'None', icon: BarChart3, color: 'text-purple-500', bg: 'bg-purple-50', isText: true },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-canvas border border-borderSubtle rounded-[2rem] p-8 shadow-soft">
                                            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6`}>
                                                <stat.icon className="w-6 h-6" />
                                            </div>
                                            <p className={`${(stat as any).isText ? 'text-xl' : 'text-4xl'} font-black text-ink truncate`}>{stat.value}</p>
                                            <p className="text-sm font-bold text-inkLight mt-1">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Table */}
                                <div className="bg-canvas border border-borderSubtle rounded-[2rem] overflow-hidden shadow-soft">
                                    <div className="px-8 py-5 bg-surface border-b border-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <h3 className="font-black text-ink">
                                            All Communities
                                            <span className="ml-2 text-sm font-bold text-inkLight">({communities.length})</span>
                                        </h3>
                                        <div className="flex gap-2">
                                            {[
                                                { label: 'Members', key: 'member_count_annotated' },
                                                { label: 'Newest', key: 'created_at' },
                                            ].map(({ label, key }) => {
                                                const asc = communitiesSort === key;
                                                const desc = communitiesSort === `-${key}`;
                                                return (
                                                    <button
                                                        key={key}
                                                        onClick={() => setCommunitiesSort(desc ? key : `-${key}`)}
                                                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors ${
                                                            asc || desc
                                                                ? 'border-gold/40 text-gold bg-gold/5'
                                                                : 'border-borderSubtle text-inkLight hover:text-gold'
                                                        }`}
                                                    >
                                                        {label} {desc ? '↓' : asc ? '↑' : ''}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                onClick={loadCommunityData}
                                                className="p-1.5 rounded-xl border border-borderSubtle text-inkLight hover:text-gold transition-colors"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${communitiesLoading ? 'animate-spin' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {communitiesLoading && communities.length === 0 ? (
                                        <div className="flex justify-center py-16">
                                            <RefreshCw className="w-5 h-5 animate-spin text-inkLight" />
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left min-w-[900px]">
                                                <thead className="bg-surface/50 border-b border-borderSubtle">
                                                    <tr>
                                                        {['Community', 'Tier', 'Members', 'Shows', 'Posts', 'Founded By', 'Created', 'Actions'].map(h => (
                                                            <th key={h} className="px-6 py-4 text-xs font-black text-inkLight uppercase tracking-widest whitespace-nowrap">
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-borderSubtle/50">
                                                    {communities.map(c => (
                                                        <tr key={c.id} className="hover:bg-surface/30 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-bold text-ink leading-tight">{c.name}</p>
                                                                <p className="text-[11px] text-inkLight">/c/{c.slug}</p>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <select
                                                                    value={c.tier}
                                                                    onChange={(e) => handleChangeTier(c.slug, e.target.value)}
                                                                    disabled={updatingTierFor === c.slug}
                                                                    className="bg-surface border border-borderSubtle rounded-xl px-3 py-1.5 text-xs font-bold text-ink focus:outline-none focus:border-gold/60 disabled:opacity-50 capitalize"
                                                                >
                                                                    {['free', 'creator', 'pro', 'enterprise'].map(t => (
                                                                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="px-6 py-4 font-black text-ink">{c.member_count}</td>
                                                            <td className="px-6 py-4 text-sm text-inkLight">{c.show_count ?? 0}</td>
                                                            <td className="px-6 py-4 text-sm text-inkLight">{c.post_count ?? 0}</td>
                                                            <td className="px-6 py-4">
                                                                {c.founder ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-6 h-6 rounded-full bg-surface border border-borderSubtle flex items-center justify-center text-[10px] font-black text-inkLight shrink-0">
                                                                            {c.founder.username[0].toUpperCase()}
                                                                        </div>
                                                                        <span className="text-xs font-bold text-inkLight truncate max-w-[80px]">{c.founder.username}</span>
                                                                    </div>
                                                                ) : <span className="text-inkLight/50">—</span>}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-inkLight whitespace-nowrap">
                                                                {new Date(c.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-1 justify-end">
                                                                    <button
                                                                        onClick={() => onNavigate('community-page', c.slug)}
                                                                        title="View community"
                                                                        className="p-1.5 rounded-lg text-inkLight hover:text-gold hover:bg-gold/10 transition-colors"
                                                                    >
                                                                        <ExternalLink className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setCommunityToDelete(c)}
                                                                        title="Delete community"
                                                                        className="p-1.5 rounded-lg text-inkLight hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'playout' && (
                            <motion.div
                                key="playout"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="min-h-[600px]"
                            >
                                <div className="bg-canvas border border-borderSubtle rounded-[2rem] p-4 md:p-8 shadow-soft overflow-hidden">
                                    <PlayoutControl onNavigate={onNavigate} adminView={true} />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'agent-controller' && (
                            <motion.div
                                key="agent-controller"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <AgentController />
                            </motion.div>
                        )}

                        {activeTab === 'news-production' && (
                            <motion.div
                                key="news-production"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <NewsProductionStudio />
                            </motion.div>
                        )}

                        {activeTab === 'link-tracker' && (
                            <motion.div
                                key="link-tracker"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className="space-y-6"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {ltDetailPartner && (
                                            <button onClick={() => { setLtDetailPartner(null); setLtSubView('partners'); }} className="p-2 hover:bg-surface rounded-xl text-inkLight hover:text-ink transition-colors">
                                                <ChevronLeft className="w-5 h-5" />
                                            </button>
                                        )}
                                        <div>
                                            <h1 className="text-3xl font-black text-ink">{ltDetailPartner ? ltDetailPartner.name : 'Link Tracker'}</h1>
                                            <p className="text-inkLight mt-1">{ltDetailPartner ? `${ltDetailPartner.slug} · ${ltDetailPartner.status}` : 'Attribution links, analytics, and API key management.'}</p>
                                        </div>
                                    </div>
                                    {ltDetailPartner && (
                                        <button onClick={() => { setLtEditingPartner(ltDetailPartner); setLtPartnerEditForm({ name: ltDetailPartner.name, default_url: ltDetailPartner.default_url, category: ltDetailPartner.category ?? '', description: ltDetailPartner.description ?? '', website: ltDetailPartner.website ?? '', twitter: ltDetailPartner.twitter ?? '', discord: ltDetailPartner.discord ?? '', telegram: ltDetailPartner.telegram ?? '', github: ltDetailPartner.github ?? '', community_page_url: ltDetailPartner.community_page_url ?? '', notes: ltDetailPartner.notes ?? '', status: ltDetailPartner.status, is_active: ltDetailPartner.is_active }); }} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink transition-colors">Edit</button>
                                    )}
                                </div>

                                {/* ── Partner Detail View ── */}
                                {ltDetailPartner ? (
                                    <div className="space-y-5">
                                        {/* Partner header info */}
                                        <div className="bg-canvas border border-borderSubtle rounded-2xl p-6 space-y-3">
                                            <div className="flex items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {ltDetailPartner.category && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wide">{ltDetailPartner.category}</span>}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${ltDetailPartner.status === 'active' ? 'bg-green-100 text-green-700' : ltDetailPartner.status === 'prospective' ? 'bg-yellow-100 text-yellow-700' : 'bg-surface text-inkLight'}`}>{ltDetailPartner.status}</span>
                                                    </div>
                                                    {ltDetailPartner.default_url && <a href={ltDetailPartner.default_url} target="_blank" rel="noopener noreferrer" className="text-sm text-gold hover:underline mt-1 block truncate">{ltDetailPartner.default_url}</a>}
                                                </div>
                                                <div className="flex items-center gap-3 text-inkLight">
                                                    {ltDetailPartner.website && <a href={ltDetailPartner.website} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors"><Globe className="w-4 h-4" /></a>}
                                                    {ltDetailPartner.twitter && <a href={`https://x.com/${ltDetailPartner.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors"><ExternalLink className="w-4 h-4" /></a>}
                                                </div>
                                            </div>
                                            <div className="flex gap-6 pt-2 border-t border-borderSubtle/50">
                                                {[
                                                    { label: 'Links', value: ltDetailPartner.link_count },
                                                    { label: 'Total Clicks', value: ltDetailPartner.total_clicks },
                                                    { label: 'Contacts', value: ltDetailPartner.contact_count },
                                                    { label: 'Campaigns', value: ltDetailPartner.campaign_count },
                                                ].map(stat => (
                                                    <div key={stat.label} className="text-center">
                                                        <p className="text-xl font-black text-ink">{stat.value?.toLocaleString() ?? '—'}</p>
                                                        <p className="text-[10px] text-inkLight font-bold uppercase tracking-wide">{stat.label}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Partner detail tabs */}
                                        <div className="flex gap-2 flex-wrap">
                                            {(['overview', 'contacts', 'products', 'campaigns', 'links'] as const).map(t => (
                                                <button key={t} onClick={() => setLtDetailTab(t)} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${ltDetailTab === t ? 'bg-ink text-canvas' : 'bg-surface text-inkLight hover:text-ink border border-borderSubtle'}`}>{t}</button>
                                            ))}
                                        </div>

                                        {/* Overview */}
                                        {ltDetailTab === 'overview' && (
                                            <div className="space-y-4">
                                                {ltDetailPartner.description && <div className="bg-canvas border border-borderSubtle rounded-2xl p-5"><p className="text-xs font-black text-inkLight uppercase tracking-widest mb-2">Description</p><p className="text-sm text-ink">{ltDetailPartner.description}</p></div>}
                                                {ltDetailPartner.notes && <div className="bg-canvas border border-borderSubtle rounded-2xl p-5"><p className="text-xs font-black text-inkLight uppercase tracking-widest mb-2">Notes</p><p className="text-sm text-inkLight whitespace-pre-wrap">{ltDetailPartner.notes}</p></div>}
                                            </div>
                                        )}

                                        {/* Contacts */}
                                        {ltDetailTab === 'contacts' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-end"><button onClick={() => setLtAddingContact(true)} className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors">+ Add Contact</button></div>
                                                {ltAddingContact && (
                                                    <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                        <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Contact</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {(['name', 'role', 'email', 'twitter', 'telegram'] as const).map(field => (
                                                                <input key={field} type="text" placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={ltNewContactForm[field]} onChange={e => setLtNewContactForm(f => ({ ...f, [field]: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            ))}
                                                        </div>
                                                        <textarea placeholder="Notes" value={ltNewContactForm.notes} onChange={e => setLtNewContactForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60 resize-none" />
                                                        <label className="flex items-center gap-2 text-sm text-inkLight cursor-pointer"><input type="checkbox" checked={ltNewContactForm.is_primary} onChange={e => setLtNewContactForm(f => ({ ...f, is_primary: e.target.checked }))} className="rounded" /><span>Primary contact</span></label>
                                                        <div className="flex gap-2">
                                                            <button onClick={async () => { if (!ltNewContactForm.name || !ltDetailPartner) return; setLtContactSaving(true); try { const c = await createLTPartnerContact(ltDetailPartner.id, ltNewContactForm); setLtDetailContacts(prev => [...prev, c]); setLtAddingContact(false); setLtNewContactForm({ name: '', role: '', email: '', twitter: '', telegram: '', notes: '', is_primary: false }); toast.success('Contact added'); } catch (e: any) { toast.error(e.message); } finally { setLtContactSaving(false); } }} disabled={ltContactSaving || !ltNewContactForm.name} className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50">{ltContactSaving ? 'Saving…' : 'Add'}</button>
                                                            <button onClick={() => setLtAddingContact(false)} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink">Cancel</button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                    {ltDetailContacts.length === 0 ? <p className="text-center text-inkLight text-sm py-10">No contacts yet.</p> : (
                                                        <table className="w-full text-sm">
                                                            <thead><tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle"><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Role</th><th className="text-left px-5 py-3">Email</th><th className="text-left px-5 py-3">Socials</th><th className="px-5 py-3" /></tr></thead>
                                                            <tbody className="divide-y divide-borderSubtle/50">
                                                                {ltDetailContacts.map(c => (
                                                                    <tr key={c.id} className="hover:bg-surface/50">
                                                                        <td className="px-5 py-3 font-bold text-ink">{c.name}{c.is_primary && <span className="ml-2 text-[10px] bg-gold/20 text-gold rounded-full px-1.5 py-0.5 font-black">Primary</span>}</td>
                                                                        <td className="px-5 py-3 text-inkLight">{c.role ?? '—'}</td>
                                                                        <td className="px-5 py-3 text-inkLight text-xs">{c.email ?? '—'}</td>
                                                                        <td className="px-5 py-3 text-xs text-inkLight">{[c.twitter && `@${c.twitter}`, c.telegram && `tg:${c.telegram}`].filter(Boolean).join(' · ') || '—'}</td>
                                                                        <td className="px-5 py-3 text-right"><button onClick={async () => { if (!ltDetailPartner || !window.confirm(`Delete ${c.name}?`)) return; try { await deleteLTPartnerContact(ltDetailPartner.id, c.id); setLtDetailContacts(p => p.filter(x => x.id !== c.id)); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } }} className="text-xs text-red-400 hover:text-red-600 font-bold">Delete</button></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Products */}
                                        {ltDetailTab === 'products' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-end"><button onClick={() => setLtAddingProduct(true)} className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors">+ Add Product</button></div>
                                                {ltAddingProduct && (
                                                    <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                        <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Product</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input type="text" placeholder="Name" value={ltNewProductForm.name} onChange={e => setLtNewProductForm(f => ({ ...f, name: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="url" placeholder="URL (optional)" value={ltNewProductForm.url} onChange={e => setLtNewProductForm(f => ({ ...f, url: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                        </div>
                                                        <textarea placeholder="Description" value={ltNewProductForm.description} onChange={e => setLtNewProductForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60 resize-none" />
                                                        <div className="flex gap-2">
                                                            <button onClick={async () => { if (!ltNewProductForm.name || !ltDetailPartner) return; setLtProductSaving(true); try { const p = await createLTPartnerProduct(ltDetailPartner.id, ltNewProductForm); setLtDetailProducts(prev => [...prev, p]); setLtAddingProduct(false); setLtNewProductForm({ name: '', description: '', url: '' }); toast.success('Product added'); } catch (e: any) { toast.error(e.message); } finally { setLtProductSaving(false); } }} disabled={ltProductSaving || !ltNewProductForm.name} className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50">{ltProductSaving ? 'Saving…' : 'Add'}</button>
                                                            <button onClick={() => setLtAddingProduct(false)} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink">Cancel</button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                    {ltDetailProducts.length === 0 ? <p className="text-center text-inkLight text-sm py-10">No products yet.</p> : (
                                                        <table className="w-full text-sm">
                                                            <thead><tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle"><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Description</th><th className="text-left px-5 py-3">URL</th><th className="px-5 py-3" /></tr></thead>
                                                            <tbody className="divide-y divide-borderSubtle/50">
                                                                {ltDetailProducts.map(pr => (
                                                                    <tr key={pr.id} className="hover:bg-surface/50">
                                                                        <td className="px-5 py-3 font-bold text-ink">{pr.name}</td>
                                                                        <td className="px-5 py-3 text-inkLight text-xs max-w-xs truncate">{pr.description ?? '—'}</td>
                                                                        <td className="px-5 py-3">{pr.url ? <a href={pr.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gold hover:underline">Link</a> : '—'}</td>
                                                                        <td className="px-5 py-3 text-right"><button onClick={async () => { if (!ltDetailPartner || !window.confirm(`Delete ${pr.name}?`)) return; try { await deleteLTPartnerProduct(ltDetailPartner.id, pr.id); setLtDetailProducts(p => p.filter(x => x.id !== pr.id)); toast.success('Deleted'); } catch (e: any) { toast.error(e.message); } }} className="text-xs text-red-400 hover:text-red-600 font-bold">Delete</button></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Campaigns */}
                                        {ltDetailTab === 'campaigns' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-end"><button onClick={() => setLtAddingCampaign(true)} className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors">+ New Campaign</button></div>
                                                {ltAddingCampaign && (
                                                    <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                        <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Campaign</p>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input type="text" placeholder="Name" value={ltNewCampaignForm.name} onChange={e => setLtNewCampaignForm(f => ({ ...f, name: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="text" placeholder="Description (optional)" value={ltNewCampaignForm.description} onChange={e => setLtNewCampaignForm(f => ({ ...f, description: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="date" value={ltNewCampaignForm.start_date} onChange={e => setLtNewCampaignForm(f => ({ ...f, start_date: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="date" value={ltNewCampaignForm.end_date} onChange={e => setLtNewCampaignForm(f => ({ ...f, end_date: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={async () => { if (!ltNewCampaignForm.name || !ltDetailPartner) return; setLtCampaignSaving(true); try { const cam = await createLTCampaign({ ...ltNewCampaignForm, partner_id: ltDetailPartner.id, start_date: ltNewCampaignForm.start_date || undefined, end_date: ltNewCampaignForm.end_date || undefined }); setLtDetailCampaigns(prev => [{ ...cam, link_count: 0, total_clicks: 0 } as LTCampaign, ...prev]); setLtAddingCampaign(false); setLtNewCampaignForm({ name: '', description: '', start_date: '', end_date: '' }); toast.success('Campaign created'); } catch (e: any) { toast.error(e.message); } finally { setLtCampaignSaving(false); } }} disabled={ltCampaignSaving || !ltNewCampaignForm.name} className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50">{ltCampaignSaving ? 'Creating…' : 'Create'}</button>
                                                            <button onClick={() => setLtAddingCampaign(false)} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink">Cancel</button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                    {ltDetailCampaigns.length === 0 ? <p className="text-center text-inkLight text-sm py-10">No campaigns yet.</p> : (
                                                        <table className="w-full text-sm">
                                                            <thead><tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle"><th className="text-left px-5 py-3">Name</th><th className="text-left px-5 py-3">Dates</th><th className="text-right px-5 py-3">Links</th><th className="text-right px-5 py-3">Clicks</th><th className="text-left px-5 py-3">Status</th><th className="px-5 py-3" /></tr></thead>
                                                            <tbody className="divide-y divide-borderSubtle/50">
                                                                {ltDetailCampaigns.map(cam => (
                                                                    <tr key={cam.id} className="hover:bg-surface/50">
                                                                        <td className="px-5 py-3 font-bold text-ink">{cam.name}</td>
                                                                        <td className="px-5 py-3 text-xs text-inkLight">{[cam.start_date, cam.end_date].filter(Boolean).join(' → ') || '—'}</td>
                                                                        <td className="px-5 py-3 text-right text-ink font-bold">{cam.link_count}</td>
                                                                        <td className="px-5 py-3 text-right text-ink font-bold">{cam.total_clicks?.toLocaleString() ?? 0}</td>
                                                                        <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${cam.is_active ? 'bg-green-100 text-green-700' : 'bg-surface text-inkLight'}`}>{cam.is_active ? 'Active' : 'Ended'}</span></td>
                                                                        <td className="px-5 py-3 text-right"><button onClick={async () => { try { const links = await fetchLTCampaignLinks(cam.id); setLtCampaignLinksModal({ campaign: cam, links: Array.isArray(links) ? links : (links.results ?? []) }); } catch (e: any) { toast.error(e.message); } }} className="text-xs text-inkLight hover:text-gold font-bold transition-colors">Links</button></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Partner Links */}
                                        {ltDetailTab === 'links' && (
                                            <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                {ltDetailLinks.length === 0 ? <p className="text-center text-inkLight text-sm py-10">No links for this partner.</p> : (
                                                    <table className="w-full text-sm">
                                                        <thead><tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle"><th className="text-left px-5 py-3">Shortcode</th><th className="text-left px-5 py-3">Surface</th><th className="text-left px-5 py-3">Campaigns</th><th className="text-right px-5 py-3">Clicks</th><th className="text-left px-5 py-3">Status</th></tr></thead>
                                                        <tbody className="divide-y divide-borderSubtle/50">
                                                            {ltDetailLinks.map(link => (
                                                                <tr key={link.id} className="hover:bg-surface/50 cursor-pointer" onClick={async () => { setLtLinkDetailId(link.id); setLtLinkDetailLoading(true); try { const d = await fetchLTLinkDetail(link.id); setLtLinkDetailModal(d); } catch (e: any) { toast.error(e.message); } finally { setLtLinkDetailLoading(false); } }}>
                                                                    <td className="px-5 py-3 font-mono text-xs text-gold">{link.shortcode}</td>
                                                                    <td className="px-5 py-3 text-inkLight">{link.surface}</td>
                                                                    <td className="px-5 py-3 text-inkLight text-xs">{link.campaigns?.map(c => c.name).join(', ') || link.campaign || '—'}</td>
                                                                    <td className="px-5 py-3 text-right font-bold">{link.click_count?.toLocaleString() ?? '—'}</td>
                                                                    <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${link.is_active ? 'bg-green-100 text-green-700' : 'bg-surface text-inkLight'}`}>{link.is_active ? 'Active' : 'Inactive'}</span></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {/* Sub-nav */}
                                        <div className="flex gap-2">
                                            {(['dashboard', 'partners', 'links', 'campaigns', 'keys'] as const).map(v => (
                                                <button key={v} onClick={() => { setLtDetailCampaign(null); setLtSubView(v); }} className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${ltSubView === v ? 'bg-ink text-canvas' : 'bg-surface text-inkLight hover:text-ink border border-borderSubtle'}`}>{v}</button>
                                            ))}
                                        </div>

                                        {/* ── Dashboard ── */}
                                        {ltSubView === 'dashboard' && (
                                            <div className="space-y-5">
                                                {/* Controls */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-2">
                                                        {(['7', '30', '90'] as const).map(d => (
                                                            <button key={d} onClick={() => setLtDashDays(d)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${ltDashDays === d ? 'bg-gold text-canvas' : 'bg-surface text-inkLight hover:text-ink border border-borderSubtle'}`}>{d}d</button>
                                                        ))}
                                                    </div>
                                                    <a href={`${API_BASE_URL}/link-tracker/analytics/export/?from=${daysAgoISO(parseInt(ltDashDays))}`} download className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-inkLight hover:text-ink border border-borderSubtle rounded-lg transition-colors">
                                                        <ExternalLink className="w-3.5 h-3.5" />Export CSV
                                                    </a>
                                                </div>

                                                {ltDashLoading ? (
                                                    <div className="flex items-center gap-2 py-16 justify-center text-inkLight"><RefreshCw className="w-5 h-5 animate-spin" /></div>
                                                ) : (
                                                    <>
                                                        {/* Summary cards */}
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 text-center">
                                                                <p className="text-3xl font-black text-ink">{ltDashSummary?.total_clicks?.toLocaleString() ?? '0'}</p>
                                                                <p className="text-xs text-inkLight font-bold mt-1 uppercase tracking-widest">Total Clicks</p>
                                                            </div>
                                                            <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 text-center">
                                                                <p className="text-3xl font-black text-ink">{ltDashSummary?.unique_visitors?.toLocaleString() ?? '0'}</p>
                                                                <p className="text-xs text-inkLight font-bold mt-1 uppercase tracking-widest">Unique Visitors</p>
                                                            </div>
                                                            <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 text-center">
                                                                <p className="text-3xl font-black text-ink">{ltDashSummary?.unique_links?.toLocaleString() ?? '0'}</p>
                                                                <p className="text-xs text-inkLight font-bold mt-1 uppercase tracking-widest">Active Links</p>
                                                            </div>
                                                        </div>

                                                        {/* By partner + by surface */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="bg-canvas border border-borderSubtle rounded-2xl p-5">
                                                                <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-4">By Partner</p>
                                                                {ltDashByPartner.length === 0 ? <p className="text-inkLight text-sm text-center py-4">No data</p> : (
                                                                    <div className="space-y-2">
                                                                        {ltDashByPartner.slice(0, 8).map(r => (
                                                                            <div key={r.group_key} className="flex items-center justify-between text-sm">
                                                                                <span className="text-ink font-bold truncate">{r.group_label}</span>
                                                                                <span className="text-inkLight ml-2 shrink-0">{r.total_clicks.toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="bg-canvas border border-borderSubtle rounded-2xl p-5">
                                                                <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-4">By Surface</p>
                                                                {ltDashBySurface.length === 0 ? <p className="text-inkLight text-sm text-center py-4">No data</p> : (
                                                                    <div className="space-y-2">
                                                                        {ltDashBySurface.slice(0, 8).map(r => (
                                                                            <div key={r.group_key} className="flex items-center justify-between text-sm">
                                                                                <span className="text-ink font-bold">{r.group_label}</span>
                                                                                <span className="text-inkLight ml-2">{r.total_clicks.toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Top links */}
                                                        <div className="bg-canvas border border-borderSubtle rounded-2xl p-5">
                                                            <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-4">Top Links</p>
                                                            {ltDashRows.length === 0 ? <p className="text-center text-inkLight text-sm py-4">No click data yet.</p> : (
                                                                <div className="overflow-x-auto">
                                                                    <table className="w-full text-sm">
                                                                        <thead><tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle"><th className="text-left pb-3">Shortcode</th><th className="text-left pb-3">Partner</th><th className="text-left pb-3">Surface</th><th className="text-right pb-3">Clicks</th></tr></thead>
                                                                        <tbody className="divide-y divide-borderSubtle/50">
                                                                            {ltDashRows.map(row => (
                                                                                <tr key={row.group_key} className="hover:bg-surface/50 transition-colors">
                                                                                    <td className="py-2.5 font-mono text-xs text-gold">{row.group_key}</td>
                                                                                    <td className="py-2.5 text-ink">{row.partner_name}</td>
                                                                                    <td className="py-2.5 text-inkLight">{row.surface}</td>
                                                                                    <td className="py-2.5 text-right font-bold text-ink">{row.total_clicks.toLocaleString()}</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* ── Partners ── */}
                                        {ltSubView === 'partners' && (
                                            <div className="space-y-4">
                                                <div className="flex justify-end">
                                                    <button onClick={() => setLtAddingPartner(true)} className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors">+ New Partner</button>
                                                </div>

                                                {ltAddingPartner && (
                                                    <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-4">
                                                        <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Partner</p>
                                                        {/* Required fields */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <input type="text" placeholder="Name *" value={ltNewPartnerForm.name} onChange={e => { const v = e.target.value; setLtNewPartnerForm(p => ({ ...p, name: v, slug: p.slug || v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })); }} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="text" placeholder="slug" value={ltNewPartnerForm.slug} onChange={e => setLtNewPartnerForm(p => ({ ...p, slug: e.target.value.toLowerCase() }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:border-gold/60" />
                                                            <input type="url" placeholder="Default URL *" value={ltNewPartnerForm.default_url} onChange={e => setLtNewPartnerForm(p => ({ ...p, default_url: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <select value={ltNewPartnerForm.category} onChange={e => setLtNewPartnerForm(p => ({ ...p, category: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                                <option value="">Category (optional)</option>
                                                                {PARTNER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        </div>

                                                        {/* More details toggle */}
                                                        <button onClick={() => setLtNewPartnerShowMore(p => !p)} className="text-xs font-bold text-inkLight hover:text-ink transition-colors">
                                                            {ltNewPartnerShowMore ? '▲ Less details' : '▼ More details'}
                                                        </button>

                                                        {ltNewPartnerShowMore && (
                                                            <div className="space-y-3 pt-2 border-t border-borderSubtle/50">
                                                                <textarea placeholder="Description" value={ltNewPartnerForm.description} onChange={e => setLtNewPartnerForm(p => ({ ...p, description: e.target.value }))} rows={2} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60 resize-none" />
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <input type="url" placeholder="Website" value={ltNewPartnerForm.website} onChange={e => setLtNewPartnerForm(p => ({ ...p, website: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                    <input type="text" placeholder="Twitter handle" value={ltNewPartnerForm.twitter} onChange={e => setLtNewPartnerForm(p => ({ ...p, twitter: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                    <input type="text" placeholder="Discord invite / username" value={ltNewPartnerForm.discord} onChange={e => setLtNewPartnerForm(p => ({ ...p, discord: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                    <input type="text" placeholder="Telegram" value={ltNewPartnerForm.telegram} onChange={e => setLtNewPartnerForm(p => ({ ...p, telegram: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                    <input type="text" placeholder="GitHub org/user" value={ltNewPartnerForm.github} onChange={e => setLtNewPartnerForm(p => ({ ...p, github: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                    <input type="url" placeholder="Community page URL" value={ltNewPartnerForm.community_page_url} onChange={e => setLtNewPartnerForm(p => ({ ...p, community_page_url: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                </div>
                                                                <select value={ltNewPartnerForm.status} onChange={e => setLtNewPartnerForm(p => ({ ...p, status: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                                    <option value="active">Active</option>
                                                                    <option value="prospective">Prospective</option>
                                                                    <option value="inactive">Inactive</option>
                                                                </select>
                                                                <textarea placeholder="Internal notes" value={ltNewPartnerForm.notes} onChange={e => setLtNewPartnerForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60 resize-none" />
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2">
                                                            <button onClick={async () => {
                                                                if (!ltNewPartnerForm.name || !ltNewPartnerForm.default_url) { toast.error('Name and Default URL are required'); return; }
                                                                setLtPartnerSaving(true);
                                                                try {
                                                                    const body: Record<string, any> = { ...ltNewPartnerForm };
                                                                    if (!body.slug) delete body.slug;
                                                                    Object.keys(body).forEach(k => { if (body[k] === '') delete body[k]; });
                                                                    await createLTPartner(body);
                                                                    setLtAddingPartner(false);
                                                                    setLtNewPartnerForm({ name: '', slug: '', default_url: '', category: '', description: '', website: '', twitter: '', discord: '', telegram: '', github: '', community_page_url: '', notes: '', status: 'active' });
                                                                    setLtNewPartnerShowMore(false);
                                                                    await loadLtPartners();
                                                                    toast.success('Partner created');
                                                                } catch (err: any) {
                                                                    toast.error(err.message || 'Failed to create partner');
                                                                } finally {
                                                                    setLtPartnerSaving(false);
                                                                }
                                                            }} disabled={ltPartnerSaving || !ltNewPartnerForm.name || !ltNewPartnerForm.default_url} className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50">{ltPartnerSaving ? 'Creating…' : 'Create'}</button>
                                                            <button onClick={() => { setLtAddingPartner(false); setLtNewPartnerShowMore(false); }} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink transition-colors">Cancel</button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                    {ltPartnersLoading ? <div className="flex items-center gap-2 py-12 justify-center text-inkLight"><RefreshCw className="w-4 h-4 animate-spin" /></div>
                                                    : ltPartners.length === 0 ? <p className="text-center text-inkLight text-sm py-12">No partners yet.</p>
                                                    : (
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                                    <th className="text-left px-5 py-3">Name</th>
                                                                    <th className="text-left px-5 py-3">Slug</th>
                                                                    <th className="text-left px-5 py-3">Category</th>
                                                                    <th className="text-left px-5 py-3">Status</th>
                                                                    <th className="text-right px-5 py-3">Links</th>
                                                                    <th className="text-right px-5 py-3">Clicks</th>
                                                                    <th className="px-5 py-3" />
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-borderSubtle/50">
                                                                {ltPartners.map(p => (
                                                                    <tr key={p.id} className="hover:bg-surface/50 transition-colors cursor-pointer" onClick={() => openLtPartnerDetail(p)}>
                                                                        <td className="px-5 py-3 font-bold text-ink">{p.name}</td>
                                                                        <td className="px-5 py-3 font-mono text-xs text-inkLight">{p.slug}</td>
                                                                        <td className="px-5 py-3 text-inkLight capitalize">{p.category ?? '—'}</td>
                                                                        <td className="px-5 py-3">
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${p.status === 'active' ? 'bg-green-100 text-green-700' : p.status === 'prospective' ? 'bg-yellow-100 text-yellow-700' : 'bg-surface text-inkLight'}`}>{p.status ?? (p.is_active ? 'active' : 'inactive')}</span>
                                                                        </td>
                                                                        <td className="px-5 py-3 text-right text-inkLight">{p.link_count ?? '—'}</td>
                                                                        <td className="px-5 py-3 text-right font-bold text-ink">{p.total_clicks?.toLocaleString() ?? '—'}</td>
                                                                        <td className="px-5 py-3 text-right" onClick={e => { e.stopPropagation(); setLtEditingPartner(p); setLtPartnerEditForm({ name: p.name, default_url: p.default_url, category: p.category ?? '', description: p.description ?? '', website: p.website ?? '', twitter: p.twitter ?? '', discord: p.discord ?? '', telegram: p.telegram ?? '', github: p.github ?? '', community_page_url: p.community_page_url ?? '', notes: p.notes ?? '', status: p.status, is_active: p.is_active }); }}>
                                                                            <span className="text-xs text-inkLight hover:text-gold font-bold transition-colors">Edit</span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Campaigns ── */}
                                        {ltSubView === 'campaigns' && (
                                            ltDetailCampaign ? (
                                                /* Campaign detail view */
                                                <div className="space-y-5">
                                                    {/* Header */}
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => setLtDetailCampaign(null)} className="p-2 hover:bg-surface rounded-xl text-inkLight hover:text-ink transition-colors">
                                                            <ChevronLeft className="w-5 h-5" />
                                                        </button>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h2 className="text-xl font-black text-ink">{ltDetailCampaign.name}</h2>
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${ltDetailCampaign.is_active ? 'bg-green-100 text-green-700' : 'bg-surface text-inkLight'}`}>{ltDetailCampaign.is_active ? 'Active' : 'Ended'}</span>
                                                            </div>
                                                            <p className="text-xs text-inkLight mt-0.5">{ltDetailCampaign.partner_name} {ltDetailCampaign.start_date || ltDetailCampaign.end_date ? `· ${[ltDetailCampaign.start_date, ltDetailCampaign.end_date].filter(Boolean).join(' → ')}` : ''}</p>
                                                        </div>
                                                        <button onClick={async () => {
                                                            if (!window.confirm('Deactivate this campaign?')) return;
                                                            try {
                                                                await updateLTCampaign(ltDetailCampaign.id, { is_active: false });
                                                                setLtDetailCampaign((prev: any) => ({ ...prev, is_active: false }));
                                                                setLtCampaigns(prev => prev.map(c => c.id === ltDetailCampaign.id ? { ...c, is_active: false } : c));
                                                                toast.success('Campaign deactivated');
                                                            } catch (e: any) { toast.error(e.message); }
                                                        }} className="px-3 py-1.5 text-xs font-bold text-red-500 border border-red-500/30 rounded-xl hover:bg-red-50 transition-colors">Deactivate</button>
                                                    </div>

                                                    {ltDetailCampaign.description && (
                                                        <p className="text-sm text-inkLight">{ltDetailCampaign.description}</p>
                                                    )}

                                                    {ltDetailCampaignLoading ? (
                                                        <div className="flex items-center gap-2 py-8 justify-center text-inkLight"><RefreshCw className="w-4 h-4 animate-spin" /></div>
                                                    ) : (
                                                        <>
                                                            {/* Stats */}
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div className="bg-canvas border border-borderSubtle rounded-2xl p-4 text-center">
                                                                    <p className="text-2xl font-black text-ink">{ltDetailCampaign.total_clicks?.toLocaleString() ?? 0}</p>
                                                                    <p className="text-xs text-inkLight font-bold mt-1 uppercase tracking-widest">Total Clicks</p>
                                                                </div>
                                                                <div className="bg-canvas border border-borderSubtle rounded-2xl p-4 text-center">
                                                                    <p className="text-2xl font-black text-ink">{ltDetailCampaign.unique_ips?.toLocaleString() ?? 0}</p>
                                                                    <p className="text-xs text-inkLight font-bold mt-1 uppercase tracking-widest">Unique IPs</p>
                                                                </div>
                                                                <div className="bg-canvas border border-borderSubtle rounded-2xl p-4 text-center">
                                                                    <p className="text-2xl font-black text-ink">{ltDetailCampaign.link_count?.toLocaleString() ?? 0}</p>
                                                                    <p className="text-xs text-inkLight font-bold mt-1 uppercase tracking-widest">Links</p>
                                                                </div>
                                                            </div>

                                                            {/* Clicks by surface */}
                                                            {ltDetailCampaign.clicks_by_surface?.length > 0 && (
                                                                <div className="bg-canvas border border-borderSubtle rounded-2xl p-5">
                                                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-3">By Surface</p>
                                                                    <div className="space-y-1.5">
                                                                        {ltDetailCampaign.clicks_by_surface.map((s: any) => (
                                                                            <div key={s.surface} className="flex items-center justify-between text-sm">
                                                                                <span className="text-ink font-bold">{s.surface}</span>
                                                                                <span className="text-inkLight">{parseInt(s.clicks).toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Clicks by day */}
                                                            {ltDetailCampaign.clicks_by_day?.length > 0 && (
                                                                <div className="bg-canvas border border-borderSubtle rounded-2xl p-5">
                                                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-3">Clicks by Day</p>
                                                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                                                        {ltDetailCampaign.clicks_by_day.map((d: any) => (
                                                                            <div key={d.date} className="flex items-center justify-between text-xs">
                                                                                <span className="text-inkLight">{d.date}</span>
                                                                                <span className="font-bold text-ink">{parseInt(d.clicks).toLocaleString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Links section */}
                                                            <div>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest">Attached Links</p>
                                                                    <button onClick={() => { setLtAttachLinkModal(ltDetailCampaign); setLtAttachLinkSelected([]); }} className="px-3 py-1.5 bg-gold text-canvas text-xs font-black rounded-xl hover:bg-gold/90 transition-colors">+ Attach Link</button>
                                                                </div>
                                                                <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                                    {!ltDetailCampaign.links?.length ? (
                                                                        <p className="text-center text-inkLight text-sm py-8">No links attached yet.</p>
                                                                    ) : (
                                                                        <table className="w-full text-sm">
                                                                            <thead><tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                                                <th className="text-left px-5 py-3">Shortcode</th>
                                                                                <th className="text-left px-5 py-3">Surface</th>
                                                                                <th className="text-right px-5 py-3">Clicks</th>
                                                                                <th className="text-left px-5 py-3">Tracked URL</th>
                                                                                <th className="px-5 py-3" />
                                                                            </tr></thead>
                                                                            <tbody className="divide-y divide-borderSubtle/50">
                                                                                {ltDetailCampaign.links.map((link: any) => (
                                                                                    <tr key={link.id} className="hover:bg-surface/50">
                                                                                        <td className="px-5 py-3 font-mono text-xs text-gold">{link.shortcode}</td>
                                                                                        <td className="px-5 py-3 text-inkLight text-xs">{link.surface}</td>
                                                                                        <td className="px-5 py-3 text-right font-bold">{(link.click_count ?? 0).toLocaleString()}</td>
                                                                                        <td className="px-5 py-3">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <span className="font-mono text-xs text-inkLight truncate max-w-[180px]">{link.tracked_url}</span>
                                                                                                <button onClick={() => navigator.clipboard.writeText(link.tracked_url).then(() => toast.success('Copied!'))} className="px-2 py-0.5 text-[10px] font-bold text-gold bg-gold/10 rounded hover:bg-gold/20 transition-colors shrink-0">Copy</button>
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-5 py-3 text-right">
                                                                                            <button onClick={async () => {
                                                                                                if (!window.confirm('Detach this link?')) return;
                                                                                                try {
                                                                                                    await detachLTCampaignLink(ltDetailCampaign.id, link.id);
                                                                                                    setLtDetailCampaign((prev: any) => ({ ...prev, links: prev.links.filter((l: any) => l.id !== link.id), link_count: prev.link_count - 1 }));
                                                                                                    toast.success('Link detached');
                                                                                                } catch (e: any) { toast.error(e.message); }
                                                                                            }} className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors">Detach</button>
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                /* Campaigns list view */
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3">
                                                        <select value={ltCampaignPartnerFilter} onChange={e => setLtCampaignPartnerFilter(e.target.value)} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                            <option value="">All Partners</option>
                                                            {ltPartners.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                                        </select>
                                                        <select value={ltCampaignStatusFilter} onChange={e => setLtCampaignStatusFilter(e.target.value)} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                            <option value="all">All Status</option>
                                                            <option value="active">Active</option>
                                                            <option value="inactive">Inactive</option>
                                                        </select>
                                                        <button onClick={() => loadLtCampaigns()} className="p-2 border border-borderSubtle rounded-xl text-inkLight hover:text-ink transition-colors"><RefreshCw className="w-4 h-4" /></button>
                                                        <button onClick={() => setLtAddingCampaignTop(v => !v)} className="ml-auto px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors">+ New Campaign</button>
                                                    </div>

                                                    {ltAddingCampaignTop && (
                                                        <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                            <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Campaign</p>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <select value={ltNewCampaignTopForm.partner_id} onChange={e => setLtNewCampaignTopForm(f => ({ ...f, partner_id: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                                    <option value="">Select partner *</option>
                                                                    {ltPartners.filter(p => p.is_active).map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                                                </select>
                                                                <input type="text" placeholder="Campaign name *" value={ltNewCampaignTopForm.name} onChange={e => setLtNewCampaignTopForm(f => ({ ...f, name: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                <input type="text" placeholder="Description (optional)" value={ltNewCampaignTopForm.description} onChange={e => setLtNewCampaignTopForm(f => ({ ...f, description: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                <div className="flex gap-2">
                                                                    <input type="date" value={ltNewCampaignTopForm.start_date} onChange={e => setLtNewCampaignTopForm(f => ({ ...f, start_date: e.target.value }))} className="flex-1 bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                    <input type="date" value={ltNewCampaignTopForm.end_date} onChange={e => setLtNewCampaignTopForm(f => ({ ...f, end_date: e.target.value }))} className="flex-1 bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={async () => {
                                                                    if (!ltNewCampaignTopForm.partner_id || !ltNewCampaignTopForm.name) { toast.error('Partner and name are required'); return; }
                                                                    setLtCampaignTopSaving(true);
                                                                    try {
                                                                        const cam = await createLTCampaign({ partner_id: parseInt(ltNewCampaignTopForm.partner_id), name: ltNewCampaignTopForm.name, description: ltNewCampaignTopForm.description || undefined, start_date: ltNewCampaignTopForm.start_date || undefined, end_date: ltNewCampaignTopForm.end_date || undefined });
                                                                        const partner = ltPartners.find(p => p.id === parseInt(ltNewCampaignTopForm.partner_id));
                                                                        setLtCampaigns(prev => [{ ...cam, partner_name: partner?.name ?? '', link_count: 0, total_clicks: 0 } as LTCampaign, ...prev]);
                                                                        setLtAddingCampaignTop(false);
                                                                        setLtNewCampaignTopForm({ partner_id: '', name: '', description: '', start_date: '', end_date: '' });
                                                                        toast.success('Campaign created');
                                                                    } catch (e: any) { toast.error(e.message); } finally { setLtCampaignTopSaving(false); }
                                                                }} disabled={ltCampaignTopSaving || !ltNewCampaignTopForm.partner_id || !ltNewCampaignTopForm.name} className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50">{ltCampaignTopSaving ? 'Creating…' : 'Create'}</button>
                                                                <button onClick={() => setLtAddingCampaignTop(false)} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink">Cancel</button>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                        {ltCampaignsLoading ? (
                                                            <div className="flex items-center gap-2 py-12 justify-center text-inkLight"><RefreshCw className="w-4 h-4 animate-spin" /></div>
                                                        ) : ltCampaigns.filter(c => ltCampaignStatusFilter === 'all' || (ltCampaignStatusFilter === 'active' ? c.is_active : !c.is_active)).length === 0 ? (
                                                            <p className="text-center text-inkLight text-sm py-12">No campaigns yet.</p>
                                                        ) : (
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                                        <th className="text-left px-5 py-3">Name</th>
                                                                        <th className="text-left px-5 py-3">Partner</th>
                                                                        <th className="text-left px-5 py-3">Date Range</th>
                                                                        <th className="text-right px-5 py-3">Links</th>
                                                                        <th className="text-right px-5 py-3">Clicks</th>
                                                                        <th className="text-left px-5 py-3">Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-borderSubtle/50">
                                                                    {ltCampaigns
                                                                        .filter(c => ltCampaignStatusFilter === 'all' || (ltCampaignStatusFilter === 'active' ? c.is_active : !c.is_active))
                                                                        .map(cam => (
                                                                            <tr key={cam.id} className="hover:bg-surface/50 transition-colors cursor-pointer" onClick={() => openLtCampaignDetail(cam)}>
                                                                                <td className="px-5 py-3 font-bold text-ink">{cam.name}</td>
                                                                                <td className="px-5 py-3 text-inkLight">{cam.partner_name}</td>
                                                                                <td className="px-5 py-3 text-xs text-inkLight">{[cam.start_date, cam.end_date].filter(Boolean).join(' → ') || 'Ongoing'}</td>
                                                                                <td className="px-5 py-3 text-right font-bold text-ink">{cam.link_count}</td>
                                                                                <td className="px-5 py-3 text-right font-bold text-ink">{cam.total_clicks?.toLocaleString() ?? 0}</td>
                                                                                <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${cam.is_active ? 'bg-green-100 text-green-700' : 'bg-surface text-inkLight'}`}>{cam.is_active ? 'Active' : 'Ended'}</span></td>
                                                                            </tr>
                                                                        ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {/* ── Links ── */}
                                        {ltSubView === 'links' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <select value={ltLinksPartnerFilter} onChange={e => setLtLinksPartnerFilter(e.target.value)} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                        <option value="">All Partners</option>
                                                        {ltPartners.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                                    </select>
                                                    <button onClick={() => loadLtLinks()} className="p-2 border border-borderSubtle rounded-xl text-inkLight hover:text-ink transition-colors"><RefreshCw className="w-4 h-4" /></button>
                                                    <button onClick={() => setLtAddingLink(v => !v)} className="ml-auto px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors">+ New Link</button>
                                                </div>

                                                {ltAddingLink && (
                                                    <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                        <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Link</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <select value={ltNewLinkForm.partner_id} onChange={e => setLtNewLinkForm(f => ({ ...f, partner_id: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                                <option value="">Select partner *</option>
                                                                {ltPartners.filter(p => p.is_active).map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                                            </select>
                                                            <select value={ltNewLinkForm.surface} onChange={e => setLtNewLinkForm(f => ({ ...f, surface: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                                {SURFACE_GROUPS.map(g => (
                                                                    <optgroup key={g.label} label={g.label}>
                                                                        {g.options.map(s => <option key={s} value={s}>{s}</option>)}
                                                                    </optgroup>
                                                                ))}
                                                            </select>
                                                            <input type="url" placeholder="Destination URL (uses partner default if blank)" value={ltNewLinkForm.destination_url} onChange={e => setLtNewLinkForm(f => ({ ...f, destination_url: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="text" placeholder="Source ref (article ID, video ID…)" value={ltNewLinkForm.source_ref} onChange={e => setLtNewLinkForm(f => ({ ...f, source_ref: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="text" placeholder="Label (human note)" value={ltNewLinkForm.label} onChange={e => setLtNewLinkForm(f => ({ ...f, label: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="text" placeholder="Campaign tag (free text)" value={ltNewLinkForm.campaign} onChange={e => setLtNewLinkForm(f => ({ ...f, campaign: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                            <input type="text" placeholder="Custom shortcode (auto if blank)" value={ltNewLinkForm.shortcode} onChange={e => setLtNewLinkForm(f => ({ ...f, shortcode: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:border-gold/60" />
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button onClick={async () => {
                                                                if (!ltNewLinkForm.partner_id) { toast.error('Partner is required'); return; }
                                                                setLtLinkSaving(true);
                                                                try {
                                                                    const body: Record<string, any> = { partner_id: parseInt(ltNewLinkForm.partner_id), surface: ltNewLinkForm.surface };
                                                                    if (ltNewLinkForm.destination_url) body.destination_url = ltNewLinkForm.destination_url;
                                                                    if (ltNewLinkForm.source_ref) body.source_ref = ltNewLinkForm.source_ref;
                                                                    if (ltNewLinkForm.label) body.label = ltNewLinkForm.label;
                                                                    if (ltNewLinkForm.campaign) body.campaign = ltNewLinkForm.campaign;
                                                                    if (ltNewLinkForm.shortcode) body.shortcode = ltNewLinkForm.shortcode;
                                                                    const result = await createLTLink(body);
                                                                    setLtNewLinkResult({ tracked_url: result.tracked_url, shortcode: result.shortcode });
                                                                    setLtNewLinkForm({ partner_id: '', destination_url: '', surface: 'elio-article', campaign: '', source_ref: '', label: '', shortcode: '' });
                                                                    await loadLtLinks();
                                                                } catch (err: any) {
                                                                    toast.error(err.message || 'Failed to create link');
                                                                } finally {
                                                                    setLtLinkSaving(false);
                                                                }
                                                            }} disabled={ltLinkSaving || !ltNewLinkForm.partner_id} className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50">{ltLinkSaving ? 'Creating…' : 'Create Link'}</button>
                                                            <button onClick={() => { setLtAddingLink(false); setLtNewLinkResult(null); }} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink transition-colors">Cancel</button>
                                                        </div>
                                                        {ltNewLinkResult && (
                                                            <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                                                                <p className="text-xs font-black text-green-700 uppercase tracking-widest mb-2">Link created!</p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-mono text-sm text-green-800 flex-1 truncate">{ltNewLinkResult.tracked_url}</p>
                                                                    <button onClick={() => navigator.clipboard.writeText(ltNewLinkResult!.tracked_url).then(() => toast.success('Copied!'))} className="px-3 py-1.5 bg-green-700 text-white text-xs font-bold rounded-lg hover:bg-green-800 transition-colors">Copy</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                    {ltLinksLoading ? <div className="flex items-center gap-2 py-12 justify-center text-inkLight"><RefreshCw className="w-4 h-4 animate-spin" /></div>
                                                    : ltLinks.length === 0 ? <p className="text-center text-inkLight text-sm py-12">No links yet.</p>
                                                    : (
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                                    <th className="text-left px-5 py-3">Shortcode</th>
                                                                    <th className="text-left px-5 py-3">Partner</th>
                                                                    <th className="text-left px-5 py-3">Surface</th>
                                                                    <th className="text-left px-5 py-3">Campaigns</th>
                                                                    <th className="text-right px-5 py-3">Clicks</th>
                                                                    <th className="text-left px-5 py-3">Status</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-borderSubtle/50">
                                                                {ltLinks.map(link => (
                                                                    <tr key={link.id} className="hover:bg-surface/50 transition-colors cursor-pointer" onClick={async () => { setLtLinkDetailId(link.id); setLtLinkDetailLoading(true); try { const d = await fetchLTLinkDetail(link.id); setLtLinkDetailModal(d); } catch (err: any) { toast.error('Failed to load link detail: ' + err.message); } finally { setLtLinkDetailLoading(false); } }}>
                                                                        <td className="px-5 py-3 font-mono text-xs text-gold">{link.shortcode}{ltLinkDetailLoading && ltLinkDetailId === link.id && <span className="ml-1 text-inkLight">…</span>}</td>
                                                                        <td className="px-5 py-3 text-ink">{link.partner_name}</td>
                                                                        <td className="px-5 py-3 text-inkLight">{link.surface}</td>
                                                                        <td className="px-5 py-3">
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {link.campaigns?.length ? link.campaigns.map(c => (
                                                                                    <button key={c.id} onClick={e => { e.stopPropagation(); setLtSubView('campaigns'); const cam = ltCampaigns.find(x => x.id === c.id); if (cam) openLtCampaignDetail(cam); }} className="px-1.5 py-0.5 bg-gold/10 text-gold text-[10px] font-bold rounded hover:bg-gold/20 transition-colors">{c.name}</button>
                                                                                )) : <span className="text-inkLight text-xs">{link.campaign ?? '—'}</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-3 text-right font-bold text-ink">{link.click_count?.toLocaleString() ?? '—'}</td>
                                                                        <td className="px-5 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${link.is_active ? 'bg-green-100 text-green-700' : 'bg-surface text-inkLight'}`}>{link.is_active ? 'Active' : 'Inactive'}</span></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Keys ── */}
                                        {ltSubView === 'keys' && (
                                            <div className="space-y-4">
                                                <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest">Generate API Key</p>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <input type="text" placeholder="Key name" value={ltNewKeyForm.name} onChange={e => setLtNewKeyForm(f => ({ ...f, name: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                                        <select value={ltNewKeyForm.scope} onChange={e => setLtNewKeyForm(f => ({ ...f, scope: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                            <option value="admin">admin</option>
                                                            <option value="write">write</option>
                                                            <option value="partner-read">partner-read</option>
                                                        </select>
                                                        <select value={ltNewKeyForm.partner_id} onChange={e => setLtNewKeyForm(f => ({ ...f, partner_id: e.target.value }))} className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                                            <option value="">No partner (global)</option>
                                                            {ltPartners.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
                                                        </select>
                                                    </div>
                                                    <button onClick={async () => {
                                                        if (!ltNewKeyForm.name) return;
                                                        setLtKeySaving(true);
                                                        try {
                                                            const body: Record<string, any> = { name: ltNewKeyForm.name, scope: ltNewKeyForm.scope };
                                                            if (ltNewKeyForm.partner_id) body.partner_id = parseInt(ltNewKeyForm.partner_id);
                                                            const result = await createLTKey(body);
                                                            setLtNewKeyResult({ key: result.key, name: ltNewKeyForm.name });
                                                            setLtNewKeyForm({ name: '', scope: 'read', partner_id: '' });
                                                            await loadLtKeys();
                                                        } catch (err: any) {
                                                            toast.error(err.message || 'Failed to create key');
                                                        } finally {
                                                            setLtKeySaving(false);
                                                        }
                                                    }} disabled={ltKeySaving || !ltNewKeyForm.name} className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50">{ltKeySaving ? 'Generating…' : 'Generate Key'}</button>
                                                </div>

                                                <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                                    {ltKeysLoading ? <div className="flex items-center gap-2 py-12 justify-center text-inkLight"><RefreshCw className="w-4 h-4 animate-spin" /></div>
                                                    : ltKeys.length === 0 ? <p className="text-center text-inkLight text-sm py-12">No API keys yet.</p>
                                                    : (
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                                    <th className="text-left px-5 py-3">Name</th>
                                                                    <th className="text-left px-5 py-3">Prefix</th>
                                                                    <th className="text-left px-5 py-3">Scope</th>
                                                                    <th className="text-left px-5 py-3">Partner</th>
                                                                    <th className="text-left px-5 py-3">Last Used</th>
                                                                    <th className="px-5 py-3" />
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-borderSubtle/50">
                                                                {ltKeys.map(k => (
                                                                    <tr key={k.id} className="hover:bg-surface/50 transition-colors cursor-pointer" onClick={() => setLtKeyDetailModal(k)}>
                                                                        <td className="px-5 py-3 font-bold text-ink">{k.name}</td>
                                                                        <td className="px-5 py-3 font-mono text-xs text-inkLight">{k.key_prefix}…</td>
                                                                        <td className="px-5 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${k.scope === 'admin' ? 'bg-red-100 text-red-700' : k.scope === 'write' ? 'bg-blue-100 text-blue-700' : 'bg-surface text-inkLight'}`}>{k.scope}</span></td>
                                                                        <td className="px-5 py-3 text-inkLight">{k.partner_name ?? '—'}</td>
                                                                        <td className="px-5 py-3 text-inkLight text-xs">{k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                                                                        <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}><button onClick={async () => { if (!window.confirm(`Delete key "${k.name}"?`)) return; try { await deleteLTKey(k.id); setLtKeys(prev => prev.filter(x => x.id !== k.id)); toast.success('Key deleted'); } catch (err: any) { toast.error(err.message); } }} className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors">Delete</button></td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'settings' && (
                            <motion.div key="settings" className="text-center py-20 grayscale opacity-40">
                                <Settings className="w-16 h-16 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold">Preferences coming soon</h3>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* User Permissions Modal */}
            <AnimatePresence>
                {managingUser && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setManagingUser(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-md p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-surface border border-borderSubtle flex items-center justify-center font-bold text-lg">
                                        {managingUser.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-black text-ink text-lg">{managingUser.username}</p>
                                        <p className="text-xs text-inkLight">Joined {new Date(managingUser.date_joined).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { setManagingUser(null); onNavigate('creator-detail', managingUser.username); }}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-inkLight hover:text-ink border border-borderSubtle rounded-xl transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" /> Profile
                                    </button>
                                    <button onClick={() => setManagingUser(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                        <X className="w-4 h-4 text-inkLight" />
                                    </button>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="space-y-5">
                                {/* Role */}
                                <div>
                                    <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-2">Role</label>
                                    <div className="flex gap-2">
                                        {['user', 'creator'].map(r => (
                                            <button
                                                key={r}
                                                onClick={() => setPermRole(r)}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-all border ${
                                                    permRole === r
                                                        ? 'bg-gold text-canvas border-gold'
                                                        : 'bg-surface border-borderSubtle text-inkLight hover:text-ink'
                                                }`}
                                            >{r}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Toggles */}
                                {([
                                    { label: 'Verified', key: 'verified', value: permVerified, set: setPermVerified, desc: 'Shows verified badge on profile' },
                                    { label: 'Staff Access', key: 'staff', value: permStaff, set: setPermStaff, desc: 'Grants admin panel access' },
                                    { label: 'Account Active', key: 'active', value: permActive, set: setPermActive, desc: 'Inactive users cannot log in' },
                                ] as const).map(({ label, key, value, set, desc }) => (
                                    <div key={key} className="flex items-center justify-between py-3 border-b border-borderSubtle/50 last:border-0">
                                        <div>
                                            <p className="font-bold text-ink text-sm">{label}</p>
                                            <p className="text-xs text-inkLight">{desc}</p>
                                        </div>
                                        <button
                                            onClick={() => set(!value)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-gold' : 'bg-borderSubtle'}`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Save */}
                            <button
                                onClick={handleSavePermissions}
                                disabled={permSaving}
                                className="mt-6 w-full py-3 bg-gold text-canvas font-black rounded-2xl hover:bg-gold/90 transition-colors disabled:opacity-50"
                            >
                                {permSaving ? 'Saving…' : 'Save Permissions'}
                            </button>

                            {/* DAP Credits — Grant / Deduct */}
                            {managingUser.stacks_address && (
                                <div className="mt-5 pt-5 border-t border-borderSubtle space-y-3">
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest">DAP Credits</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            placeholder="Amount"
                                            value={grantAmount}
                                            onChange={e => setGrantAmount(e.target.value)}
                                            className="w-24 bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:border-gold/60"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Description (optional)"
                                            value={grantDescription}
                                            onChange={e => setGrantDescription(e.target.value)}
                                            className="flex-1 bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleGrantDap}
                                            disabled={grantSaving || deductSaving || !grantAmount}
                                            className="flex-1 py-2.5 border-2 border-dashed border-gold/40 rounded-xl text-sm font-bold text-gold hover:border-gold hover:bg-gold/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Zap className="w-4 h-4" />
                                            {grantSaving ? 'Granting…' : 'Grant'}
                                        </button>
                                        <button
                                            onClick={handleDeductDap}
                                            disabled={grantSaving || deductSaving || !grantAmount}
                                            className="flex-1 py-2.5 border-2 border-dashed border-red-500/40 rounded-xl text-sm font-bold text-red-500 hover:border-red-500 hover:bg-red-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <Minus className="w-4 h-4" />
                                            {deductSaving ? 'Deducting…' : 'Deduct'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleZeroOut}
                                        disabled={zeroOutSaving}
                                        className="w-full py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                    >
                                        {zeroOutSaving ? 'Zeroing out…' : '⚡ Zero Out Balance'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Link Tracker — Partner Edit Modal */}
            <AnimatePresence>
                {ltEditingPartner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setLtEditingPartner(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <p className="font-black text-ink text-lg">Edit Partner</p>
                                <button onClick={() => setLtEditingPartner(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-inkLight" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Name</label>
                                        <input type="text" value={ltPartnerEditForm.name ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Default URL</label>
                                        <input type="text" value={ltPartnerEditForm.default_url ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, default_url: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Category</label>
                                        <select value={ltPartnerEditForm.category ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                            <option value="">— none —</option>
                                            {PARTNER_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Status</label>
                                        <select value={ltPartnerEditForm.status ?? 'active'} onChange={e => setLtPartnerEditForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60">
                                            <option value="active">active</option>
                                            <option value="prospective">prospective</option>
                                            <option value="inactive">inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Description</label>
                                    <textarea value={ltPartnerEditForm.description ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60 resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Website</label>
                                        <input type="text" value={ltPartnerEditForm.website ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, website: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Twitter</label>
                                        <input type="text" value={ltPartnerEditForm.twitter ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, twitter: e.target.value }))} placeholder="@handle" className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Discord</label>
                                        <input type="text" value={ltPartnerEditForm.discord ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, discord: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Telegram</label>
                                        <input type="text" value={ltPartnerEditForm.telegram ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, telegram: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">GitHub</label>
                                        <input type="text" value={ltPartnerEditForm.github ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, github: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Community Page URL</label>
                                        <input type="text" value={ltPartnerEditForm.community_page_url ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, community_page_url: e.target.value }))} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Notes</label>
                                    <textarea value={ltPartnerEditForm.notes ?? ''} onChange={e => setLtPartnerEditForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60 resize-none" />
                                </div>
                                <div className="flex items-center justify-between py-2 border-t border-borderSubtle/50">
                                    <div>
                                        <p className="font-bold text-ink text-sm">Active</p>
                                        <p className="text-xs text-inkLight">Inactive partners cannot receive clicks</p>
                                    </div>
                                    <button
                                        onClick={() => setLtPartnerEditForm(f => ({ ...f, is_active: !f.is_active }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${ltPartnerEditForm.is_active ? 'bg-gold' : 'bg-borderSubtle'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ltPartnerEditForm.is_active ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={async () => {
                                        if (!ltEditingPartner) return;
                                        setLtPartnerSaving(true);
                                        try {
                                            await updateLTPartner(ltEditingPartner.id, ltPartnerEditForm);
                                            setLtPartners(prev => prev.map(p => p.id === ltEditingPartner.id ? { ...p, ...ltPartnerEditForm } : p));
                                            if (ltDetailPartner?.id === ltEditingPartner.id) setLtDetailPartner(prev => prev ? { ...prev, ...ltPartnerEditForm } : prev);
                                            setLtEditingPartner(null);
                                            toast.success('Partner updated');
                                        } catch (err: any) {
                                            toast.error(err.message || 'Failed to update partner');
                                        } finally {
                                            setLtPartnerSaving(false);
                                        }
                                    }}
                                    disabled={ltPartnerSaving}
                                    className="flex-1 py-3 bg-gold text-canvas font-black rounded-2xl hover:bg-gold/90 transition-colors disabled:opacity-50"
                                >{ltPartnerSaving ? 'Saving…' : 'Save'}</button>
                                <button
                                    onClick={async () => {
                                        if (!ltEditingPartner || !window.confirm(`Delete partner "${ltEditingPartner.name}"?`)) return;
                                        try {
                                            await deleteLTPartner(ltEditingPartner.id);
                                            setLtPartners(prev => prev.filter(p => p.id !== ltEditingPartner.id));
                                            setLtEditingPartner(null);
                                            setLtDetailPartner(null);
                                            toast.success('Partner deleted');
                                        } catch (err: any) {
                                            toast.error(err.message || 'Failed to delete partner');
                                        }
                                    }}
                                    className="px-4 py-3 border border-red-500/30 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors text-sm"
                                >Delete</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Link Tracker — New Key Modal */}
            <AnimatePresence>
                {ltNewKeyResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-md p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-black text-ink text-lg">API Key Generated</p>
                                    <p className="text-xs text-inkLight">Copy it now — it will not be shown again</p>
                                </div>
                            </div>
                            <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-2">{ltNewKeyResult.name}</p>
                            <div className="bg-surface border border-borderSubtle rounded-xl p-4 mb-6">
                                <p className="font-mono text-sm text-gold break-all select-all">{ltNewKeyResult.key}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => navigator.clipboard.writeText(ltNewKeyResult!.key).then(() => toast.success('Copied!'))}
                                    className="flex-1 py-3 bg-gold text-canvas font-black rounded-2xl hover:bg-gold/90 transition-colors"
                                >Copy Key</button>
                                <button
                                    onClick={() => setLtNewKeyResult(null)}
                                    className="flex-1 py-3 border border-borderSubtle text-inkLight font-bold rounded-2xl hover:text-ink transition-colors"
                                >Close</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Link Tracker — Link Detail Modal */}
            <AnimatePresence>
                {ltLinkDetailModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setLtLinkDetailModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-lg p-8 max-h-[90vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="font-black text-ink text-lg font-mono">{ltLinkDetailModal.shortcode}</p>
                                    <p className="text-xs text-inkLight">{ltLinkDetailModal.partner_name} · {ltLinkDetailModal.surface}</p>
                                </div>
                                <button onClick={() => setLtLinkDetailModal(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-inkLight" />
                                </button>
                            </div>
                            {/* Tracked URL */}
                            {ltLinkDetailModal.tracked_url && (
                                <div className="flex items-center gap-2 mb-5 p-3 bg-surface rounded-xl border border-borderSubtle">
                                    <p className="font-mono text-xs text-gold flex-1 truncate">{ltLinkDetailModal.tracked_url}</p>
                                    <button onClick={() => navigator.clipboard.writeText(ltLinkDetailModal.tracked_url).then(() => toast.success('Copied!'))} className="px-2 py-1 bg-gold/10 text-gold text-xs font-bold rounded-lg hover:bg-gold/20 transition-colors shrink-0">Copy</button>
                                </div>
                            )}
                            {/* Destination */}
                            {ltLinkDetailModal.destination_url && (
                                <div className="mb-5">
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-1">Destination</p>
                                    <p className="text-sm text-ink break-all">{ltLinkDetailModal.destination_url}</p>
                                </div>
                            )}
                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <div className="bg-surface rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-black text-ink">{(ltLinkDetailModal.total_clicks ?? ltLinkDetailModal.click_count ?? 0).toLocaleString()}</p>
                                    <p className="text-xs text-inkLight font-bold mt-1">Total Clicks</p>
                                </div>
                                <div className="bg-surface rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-black text-ink">{(ltLinkDetailModal.unique_ips ?? 0).toLocaleString()}</p>
                                    <p className="text-xs text-inkLight font-bold mt-1">Unique IPs</p>
                                </div>
                            </div>
                            {/* Meta */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-5">
                                {ltLinkDetailModal.campaign_name && <><span className="text-inkLight">Campaign</span><span className="text-ink font-bold">{ltLinkDetailModal.campaign_name}</span></>}
                                {ltLinkDetailModal.campaign && <><span className="text-inkLight">Tag</span><span className="text-ink font-bold">{ltLinkDetailModal.campaign}</span></>}
                                {ltLinkDetailModal.source_ref && <><span className="text-inkLight">Source ref</span><span className="text-ink font-bold">{ltLinkDetailModal.source_ref}</span></>}
                                {ltLinkDetailModal.label && <><span className="text-inkLight">Label</span><span className="text-ink font-bold">{ltLinkDetailModal.label}</span></>}
                                <span className="text-inkLight">Status</span><span className={ltLinkDetailModal.is_active ? 'text-green-600 font-bold' : 'text-inkLight'}>{ltLinkDetailModal.is_active ? 'Active' : 'Inactive'}</span>
                                <span className="text-inkLight">Created</span><span className="text-ink">{ltLinkDetailModal.created_at ? new Date(ltLinkDetailModal.created_at).toLocaleDateString() : '—'}</span>
                            </div>
                            {/* By day */}
                            {ltLinkDetailModal.by_day?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-2">Clicks by Day</p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                        {ltLinkDetailModal.by_day.map((d: any) => (
                                            <div key={d.date} className="flex items-center justify-between text-xs">
                                                <span className="text-inkLight">{d.date}</span>
                                                <span className="font-bold text-ink">{d.clicks.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* By country */}
                            {ltLinkDetailModal.by_country?.length > 0 && (
                                <div className="mb-5">
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-2">By Country</p>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {ltLinkDetailModal.by_country.slice(0, 10).map((d: any) => (
                                            <div key={d.country} className="flex items-center justify-between text-sm">
                                                <span className="text-ink font-bold">{d.country || 'Unknown'}</span>
                                                <span className="text-inkLight">{d.clicks.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* By referrer */}
                            {ltLinkDetailModal.by_referrer?.length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-2">By Referrer</p>
                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {ltLinkDetailModal.by_referrer.slice(0, 10).map((d: any) => (
                                            <div key={d.referrer} className="flex items-center justify-between text-xs">
                                                <span className="text-inkLight truncate max-w-[240px]">{d.referrer || 'Direct'}</span>
                                                <span className="font-bold text-ink ml-2 shrink-0">{d.clicks.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Campaigns */}
                            {ltLinkDetailModal.campaigns?.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-borderSubtle">
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-2">Campaigns</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ltLinkDetailModal.campaigns.map((c: any) => (
                                            <button key={c.id} onClick={() => { setLtLinkDetailModal(null); setLtSubView('campaigns'); const cam = ltCampaigns.find(x => x.id === c.id); if (cam) openLtCampaignDetail(cam); }} className="px-2 py-1 bg-gold/10 text-gold text-xs font-bold rounded-lg hover:bg-gold/20 transition-colors">{c.name}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Link Tracker — Key Detail Modal */}
            <AnimatePresence>
                {ltKeyDetailModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setLtKeyDetailModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-sm p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="font-black text-ink text-lg">{ltKeyDetailModal.name}</p>
                                    <p className="font-mono text-xs text-inkLight mt-0.5">{ltKeyDetailModal.key_prefix}…</p>
                                </div>
                                <button onClick={() => setLtKeyDetailModal(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-inkLight" />
                                </button>
                            </div>
                            <div className="space-y-3 text-sm mb-6">
                                <div className="flex items-center justify-between py-2 border-b border-borderSubtle/50">
                                    <span className="text-xs font-black text-inkLight uppercase tracking-widest">Scope</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${ltKeyDetailModal.scope === 'admin' ? 'bg-red-100 text-red-700' : ltKeyDetailModal.scope === 'write' ? 'bg-blue-100 text-blue-700' : 'bg-surface text-inkLight'}`}>{ltKeyDetailModal.scope}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-borderSubtle/50">
                                    <span className="text-xs font-black text-inkLight uppercase tracking-widest">Partner</span>
                                    <span className="text-ink font-bold">{ltKeyDetailModal.partner_name ?? 'Global'}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-borderSubtle/50">
                                    <span className="text-xs font-black text-inkLight uppercase tracking-widest">Created</span>
                                    <span className="text-ink">{new Date(ltKeyDetailModal.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-xs font-black text-inkLight uppercase tracking-widest">Last Used</span>
                                    <span className="text-ink">{ltKeyDetailModal.last_used_at ? timeAgo(ltKeyDetailModal.last_used_at) : 'Never'}</span>
                                </div>
                            </div>
                            <p className="text-xs text-inkLight mb-6">
                                {ltKeyDetailModal.scope === 'admin' ? 'Full access: manage partners, links, keys, and analytics.' : ltKeyDetailModal.scope === 'write' ? 'Write access: create and manage links and view analytics.' : 'Read-only access for a specific partner\'s analytics and links.'}
                            </p>
                            <button
                                onClick={async () => {
                                    if (!window.confirm(`Revoke key "${ltKeyDetailModal!.name}"? This cannot be undone.`)) return;
                                    try {
                                        await deleteLTKey(ltKeyDetailModal!.id);
                                        setLtKeys(prev => prev.filter(k => k.id !== ltKeyDetailModal!.id));
                                        setLtKeyDetailModal(null);
                                        toast.success('Key revoked');
                                    } catch (err: any) {
                                        toast.error(err.message || 'Failed to revoke key');
                                    }
                                }}
                                className="w-full py-3 border border-red-500/30 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors text-sm"
                            >Revoke Key</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Link Tracker — Campaign Links Modal */}
            <AnimatePresence>
                {ltCampaignLinksModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setLtCampaignLinksModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[85vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="font-black text-ink text-lg">{ltCampaignLinksModal.campaign.name}</p>
                                    <p className="text-xs text-inkLight">{ltCampaignLinksModal.links.length} link{ltCampaignLinksModal.links.length !== 1 ? 's' : ''}</p>
                                </div>
                                <button onClick={() => setLtCampaignLinksModal(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-inkLight" />
                                </button>
                            </div>
                            {ltCampaignLinksModal.links.length === 0 ? (
                                <p className="text-center text-inkLight text-sm py-12">No links in this campaign yet.</p>
                            ) : (
                                <div className="bg-surface rounded-2xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                <th className="text-left px-4 py-3">Shortcode</th>
                                                <th className="text-left px-4 py-3">Surface</th>
                                                <th className="text-right px-4 py-3">Clicks</th>
                                                <th className="text-left px-4 py-3">Tracked URL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-borderSubtle/50">
                                            {ltCampaignLinksModal.links.map(link => (
                                                <tr key={link.id} className="hover:bg-canvas transition-colors">
                                                    <td className="px-4 py-3 font-mono text-xs text-gold">{link.shortcode}</td>
                                                    <td className="px-4 py-3 text-inkLight text-xs">{link.surface}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-ink">{(link.click_count ?? 0).toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs text-inkLight truncate max-w-[200px]">{link.tracked_url}</span>
                                                            <button onClick={() => navigator.clipboard.writeText(link.tracked_url!).then(() => toast.success('Copied!'))} className="px-2 py-0.5 text-[10px] font-bold text-gold bg-gold/10 rounded hover:bg-gold/20 transition-colors shrink-0">Copy</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Link Tracker — Attach Link Modal */}
            <AnimatePresence>
                {ltAttachLinkModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setLtAttachLinkModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-2xl p-8 max-h-[85vh] overflow-y-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="font-black text-ink text-lg">Attach Links</p>
                                    <p className="text-xs text-inkLight mt-0.5">Add existing links to "{ltAttachLinkModal.name}"</p>
                                </div>
                                <button onClick={() => setLtAttachLinkModal(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-inkLight" />
                                </button>
                            </div>
                            {ltLinks.length === 0 ? (
                                <p className="text-center text-inkLight text-sm py-8">No links available. Create links first.</p>
                            ) : (
                                <>
                                    <div className="bg-surface rounded-2xl overflow-hidden mb-5 max-h-96 overflow-y-auto">
                                        <table className="w-full text-sm">
                                            <thead><tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle bg-surface sticky top-0">
                                                <th className="px-4 py-3 w-8" />
                                                <th className="text-left px-4 py-3">Shortcode</th>
                                                <th className="text-left px-4 py-3">Partner</th>
                                                <th className="text-left px-4 py-3">Surface</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-borderSubtle/50">
                                                {ltLinks.map(link => {
                                                    const alreadyAttached = ltDetailCampaign?.links?.some((l: any) => l.id === link.id);
                                                    return (
                                                        <tr key={link.id} className={`transition-colors ${alreadyAttached ? 'opacity-40 cursor-not-allowed' : 'hover:bg-canvas cursor-pointer'}`} onClick={() => { if (alreadyAttached) return; setLtAttachLinkSelected(prev => prev.includes(link.id) ? prev.filter(id => id !== link.id) : [...prev, link.id]); }}>
                                                            <td className="px-4 py-3"><input type="checkbox" checked={ltAttachLinkSelected.includes(link.id)} disabled={alreadyAttached} readOnly className="accent-gold" /></td>
                                                            <td className="px-4 py-3 font-mono text-xs text-gold">{link.shortcode}</td>
                                                            <td className="px-4 py-3 text-ink">{link.partner_name}</td>
                                                            <td className="px-4 py-3 text-inkLight text-xs">{link.surface}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-inkLight">{ltAttachLinkSelected.length} selected</span>
                                        <div className="flex gap-3">
                                            <button onClick={() => setLtAttachLinkModal(null)} className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink transition-colors">Cancel</button>
                                            <button
                                                onClick={async () => {
                                                    if (ltAttachLinkSelected.length === 0) return;
                                                    setLtAttachLinkSaving(true);
                                                    try {
                                                        await attachLTCampaignLinks(ltAttachLinkModal!.id, ltAttachLinkSelected);
                                                        // Refresh detail
                                                        const full = await ltFetch(`campaigns/${ltAttachLinkModal!.id}/`);
                                                        setLtDetailCampaign(full);
                                                        setLtCampaigns(prev => prev.map(c => c.id === ltAttachLinkModal!.id ? { ...c, link_count: full.link_count } : c));
                                                        setLtAttachLinkModal(null);
                                                        setLtAttachLinkSelected([]);
                                                        toast.success(`${ltAttachLinkSelected.length} link(s) attached`);
                                                    } catch (e: any) {
                                                        toast.error(e.message || 'Failed to attach links');
                                                    } finally {
                                                        setLtAttachLinkSaving(false);
                                                    }
                                                }}
                                                disabled={ltAttachLinkSaving || ltAttachLinkSelected.length === 0}
                                                className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
                                            >{ltAttachLinkSaving ? 'Attaching…' : 'Attach Selected'}</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Community Confirmation Modal */}
            <AnimatePresence>
                {communityToDelete && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => !deletingCommunity && setCommunityToDelete(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-sm p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <Trash2 className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-black text-ink text-lg">Delete Community</p>
                                    <p className="text-xs text-inkLight">This cannot be undone</p>
                                </div>
                            </div>
                            <p className="text-sm text-inkLight mb-2">
                                You are about to permanently delete:
                            </p>
                            <p className="font-black text-ink mb-1">{communityToDelete.name}</p>
                            <p className="text-xs text-inkLight mb-8">/c/{communityToDelete.slug} · {communityToDelete.member_count} members</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setCommunityToDelete(null)}
                                    disabled={deletingCommunity}
                                    className="flex-1 py-3 rounded-2xl border border-borderSubtle text-inkLight font-bold text-sm hover:text-ink hover:bg-surface transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteCommunity}
                                    disabled={deletingCommunity}
                                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {deletingCommunity ? 'Deleting…' : 'Delete'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
