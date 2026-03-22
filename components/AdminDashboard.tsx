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
    active: boolean;
    created_at: string;
}

interface LTLink {
    id: number;
    shortcode: string;
    partner_id: number;
    partner_name: string;
    destination_url: string;
    surface: string;
    active: boolean;
    total_clicks: number;
    created_at: string;
}

interface LTKey {
    id: number;
    name: string;
    scope: string;
    partner_id: number | null;
    partner_name: string | null;
    last_used_at: string | null;
    created_at: string;
}

interface LTGroupedRow {
    shortcode: string;
    partner_name: string;
    surface: string;
    total_clicks: number;
    unique_ips: number;
}

interface LTLinkStats {
    shortcode: string;
    total_clicks: number;
    unique_ips: number;
    clicks_by_country: Record<string, number>;
    clicks_by_day: { date: string; count: number }[];
}

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
    const [ltSubView, setLtSubView] = useState<'dashboard' | 'partners' | 'links' | 'keys'>('dashboard');
    // Dashboard sub-view
    const [ltDashRows, setLtDashRows] = useState<LTGroupedRow[]>([]);
    const [ltDashLoading, setLtDashLoading] = useState(false);
    const [ltDashDays, setLtDashDays] = useState<'7' | '30' | '90'>('30');
    const [ltDashTotal, setLtDashTotal] = useState(0);
    // Partners sub-view
    const [ltPartners, setLtPartners] = useState<LTPartner[]>([]);
    const [ltPartnersLoading, setLtPartnersLoading] = useState(false);
    const [ltEditingPartner, setLtEditingPartner] = useState<LTPartner | null>(null);
    const [ltPartnerForm, setLtPartnerForm] = useState({ name: '', slug: '', active: true });
    const [ltPartnerSaving, setLtPartnerSaving] = useState(false);
    const [ltAddingPartner, setLtAddingPartner] = useState(false);
    const [ltNewPartnerForm, setLtNewPartnerForm] = useState({ name: '', slug: '' });
    // Links sub-view
    const [ltLinks, setLtLinks] = useState<LTLink[]>([]);
    const [ltLinksLoading, setLtLinksLoading] = useState(false);
    const [ltLinksPartnerFilter, setLtLinksPartnerFilter] = useState('');
    const [ltLinkStatsModal, setLtLinkStatsModal] = useState<LTLinkStats | null>(null);
    const [ltLinkStatsShortcode, setLtLinkStatsShortcode] = useState('');
    const [ltLinkStatsLoading, setLtLinkStatsLoading] = useState(false);
    const [ltAddingLink, setLtAddingLink] = useState(false);
    const [ltNewLinkForm, setLtNewLinkForm] = useState({ partner_id: '', destination_url: '', surface: 'bio' });
    const [ltLinkSaving, setLtLinkSaving] = useState(false);
    // Keys sub-view
    const [ltKeys, setLtKeys] = useState<LTKey[]>([]);
    const [ltKeysLoading, setLtKeysLoading] = useState(false);
    const [ltNewKeyResult, setLtNewKeyResult] = useState<{ key: string; name: string } | null>(null);
    const [ltNewKeyForm, setLtNewKeyForm] = useState({ name: '', scope: 'read', partner_id: '' });
    const [ltKeySaving, setLtKeySaving] = useState(false);

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
        if (ltSubView === 'links') loadLtLinks();
        if (ltSubView === 'keys') loadLtKeys();
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
            const data = await fetchLTAnalytics({ group_by: 'shortcode', from: daysAgoISO(parseInt(ltDashDays)) });
            const rows: LTGroupedRow[] = Array.isArray(data) ? data : (data.rows ?? data.results ?? []);
            setLtDashRows(rows);
            setLtDashTotal(rows.reduce((s: number, r: LTGroupedRow) => s + r.total_clicks, 0));
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
                                    <div>
                                        <h1 className="text-3xl font-black text-ink">Link Tracker</h1>
                                        <p className="text-inkLight mt-1">Attribution links, analytics, and API key management.</p>
                                    </div>
                                </div>

                                {/* Sub-nav */}
                                <div className="flex gap-2">
                                    {(['dashboard', 'partners', 'links', 'keys'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setLtSubView(v)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                                                ltSubView === v
                                                    ? 'bg-ink text-canvas'
                                                    : 'bg-surface text-inkLight hover:text-ink border border-borderSubtle'
                                            }`}
                                        >{v}</button>
                                    ))}
                                </div>

                                {/* ── Dashboard ── */}
                                {ltSubView === 'dashboard' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex gap-2">
                                                {(['7', '30', '90'] as const).map(d => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setLtDashDays(d)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            ltDashDays === d
                                                                ? 'bg-gold text-canvas'
                                                                : 'bg-surface text-inkLight hover:text-ink border border-borderSubtle'
                                                        }`}
                                                    >{d}d</button>
                                                ))}
                                            </div>
                                            <a
                                                href={`${API_BASE_URL}/link-tracker/analytics/export/?from=${daysAgoISO(parseInt(ltDashDays))}`}
                                                download
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-inkLight hover:text-ink border border-borderSubtle rounded-lg transition-colors"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Export CSV
                                            </a>
                                        </div>

                                        <div className="bg-canvas border border-borderSubtle rounded-2xl p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <p className="text-xs font-black text-inkLight uppercase tracking-widest">Click Summary</p>
                                                <span className="text-xs font-bold text-inkLight">Total: {ltDashTotal.toLocaleString()}</span>
                                            </div>
                                            {ltDashLoading ? (
                                                <div className="flex items-center gap-2 py-8 justify-center text-inkLight">
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                </div>
                                            ) : ltDashRows.length === 0 ? (
                                                <p className="text-center text-inkLight text-sm py-8">No click data yet.</p>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-xs text-inkLight font-black uppercase tracking-widest">
                                                                <th className="text-left pb-3">Shortcode</th>
                                                                <th className="text-left pb-3">Partner</th>
                                                                <th className="text-left pb-3">Surface</th>
                                                                <th className="text-right pb-3">Clicks</th>
                                                                <th className="text-right pb-3">Unique IPs</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-borderSubtle/50">
                                                            {ltDashRows.map(row => (
                                                                <tr key={row.shortcode} className="hover:bg-surface/50 transition-colors">
                                                                    <td className="py-2.5 font-mono text-xs text-gold">{row.shortcode}</td>
                                                                    <td className="py-2.5 text-ink">{row.partner_name}</td>
                                                                    <td className="py-2.5 text-inkLight capitalize">{row.surface}</td>
                                                                    <td className="py-2.5 text-right font-bold text-ink">{row.total_clicks.toLocaleString()}</td>
                                                                    <td className="py-2.5 text-right text-inkLight">{row.unique_ips.toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── Partners ── */}
                                {ltSubView === 'partners' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => setLtAddingPartner(true)}
                                                className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors"
                                            >+ New Partner</button>
                                        </div>

                                        {ltAddingPartner && (
                                            <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Partner</p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Name"
                                                        value={ltNewPartnerForm.name}
                                                        onChange={e => setLtNewPartnerForm(p => ({ ...p, name: e.target.value }))}
                                                        className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="slug (auto-generated if blank)"
                                                        value={ltNewPartnerForm.slug}
                                                        onChange={e => setLtNewPartnerForm(p => ({ ...p, slug: e.target.value }))}
                                                        className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:border-gold/60"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (!ltNewPartnerForm.name) return;
                                                            setLtPartnerSaving(true);
                                                            try {
                                                                await createLTPartner({ name: ltNewPartnerForm.name, slug: ltNewPartnerForm.slug || undefined });
                                                                setLtAddingPartner(false);
                                                                setLtNewPartnerForm({ name: '', slug: '' });
                                                                await loadLtPartners();
                                                                toast.success('Partner created');
                                                            } catch (err: any) {
                                                                toast.error(err.message || 'Failed to create partner');
                                                            } finally {
                                                                setLtPartnerSaving(false);
                                                            }
                                                        }}
                                                        disabled={ltPartnerSaving || !ltNewPartnerForm.name}
                                                        className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50"
                                                    >{ltPartnerSaving ? 'Creating…' : 'Create'}</button>
                                                    <button
                                                        onClick={() => { setLtAddingPartner(false); setLtNewPartnerForm({ name: '', slug: '' }); }}
                                                        className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink transition-colors"
                                                    >Cancel</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                            {ltPartnersLoading ? (
                                                <div className="flex items-center gap-2 py-12 justify-center text-inkLight">
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                </div>
                                            ) : ltPartners.length === 0 ? (
                                                <p className="text-center text-inkLight text-sm py-12">No partners yet.</p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                            <th className="text-left px-5 py-3">Name</th>
                                                            <th className="text-left px-5 py-3">Slug</th>
                                                            <th className="text-left px-5 py-3">Status</th>
                                                            <th className="text-left px-5 py-3">Created</th>
                                                            <th className="px-5 py-3" />
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-borderSubtle/50">
                                                        {ltPartners.map(p => (
                                                            <tr key={p.id} className="hover:bg-surface/50 transition-colors">
                                                                <td className="px-5 py-3 font-bold text-ink">{p.name}</td>
                                                                <td className="px-5 py-3 font-mono text-xs text-inkLight">{p.slug}</td>
                                                                <td className="px-5 py-3">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                                        p.active ? 'bg-green-100 text-green-700' : 'bg-surface text-inkLight'
                                                                    }`}>{p.active ? 'Active' : 'Inactive'}</span>
                                                                </td>
                                                                <td className="px-5 py-3 text-inkLight text-xs">{timeAgo(p.created_at)}</td>
                                                                <td className="px-5 py-3 text-right">
                                                                    <button
                                                                        onClick={() => {
                                                                            setLtEditingPartner(p);
                                                                            setLtPartnerForm({ name: p.name, slug: p.slug, active: p.active });
                                                                        }}
                                                                        className="text-xs text-inkLight hover:text-gold font-bold transition-colors"
                                                                    >Edit</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── Links ── */}
                                {ltSubView === 'links' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={ltLinksPartnerFilter}
                                                onChange={e => setLtLinksPartnerFilter(e.target.value)}
                                                className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                            >
                                                <option value="">All Partners</option>
                                                {ltPartners.map(p => (
                                                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => loadLtLinks()}
                                                className="p-2 border border-borderSubtle rounded-xl text-inkLight hover:text-ink transition-colors"
                                            ><RefreshCw className="w-4 h-4" /></button>
                                            <button
                                                onClick={() => setLtAddingLink(true)}
                                                className="ml-auto px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors"
                                            >+ New Link</button>
                                        </div>

                                        {ltAddingLink && (
                                            <div className="bg-canvas border border-borderSubtle rounded-2xl p-5 space-y-3">
                                                <p className="text-xs font-black text-inkLight uppercase tracking-widest">New Link</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <select
                                                        value={ltNewLinkForm.partner_id}
                                                        onChange={e => setLtNewLinkForm(f => ({ ...f, partner_id: e.target.value }))}
                                                        className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                                    >
                                                        <option value="">Select partner…</option>
                                                        {ltPartners.filter(p => p.active).map(p => (
                                                            <option key={p.id} value={String(p.id)}>{p.name}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="url"
                                                        placeholder="Destination URL"
                                                        value={ltNewLinkForm.destination_url}
                                                        onChange={e => setLtNewLinkForm(f => ({ ...f, destination_url: e.target.value }))}
                                                        className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                                    />
                                                    <select
                                                        value={ltNewLinkForm.surface}
                                                        onChange={e => setLtNewLinkForm(f => ({ ...f, surface: e.target.value }))}
                                                        className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                                    >
                                                        {['bio', 'newsletter', 'podcast', 'social', 'blog', 'ad', 'collab', 'other'].map(s => (
                                                            <option key={s} value={s}>{s}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            if (!ltNewLinkForm.partner_id || !ltNewLinkForm.destination_url) return;
                                                            setLtLinkSaving(true);
                                                            try {
                                                                await createLTLink({
                                                                    partner_id: parseInt(ltNewLinkForm.partner_id),
                                                                    destination_url: ltNewLinkForm.destination_url,
                                                                    surface: ltNewLinkForm.surface,
                                                                });
                                                                setLtAddingLink(false);
                                                                setLtNewLinkForm({ partner_id: '', destination_url: '', surface: 'bio' });
                                                                await loadLtLinks();
                                                                toast.success('Link created');
                                                            } catch (err: any) {
                                                                toast.error(err.message || 'Failed to create link');
                                                            } finally {
                                                                setLtLinkSaving(false);
                                                            }
                                                        }}
                                                        disabled={ltLinkSaving || !ltNewLinkForm.partner_id || !ltNewLinkForm.destination_url}
                                                        className="px-4 py-2 bg-gold text-canvas text-sm font-bold rounded-xl disabled:opacity-50"
                                                    >{ltLinkSaving ? 'Creating…' : 'Create'}</button>
                                                    <button
                                                        onClick={() => { setLtAddingLink(false); setLtNewLinkForm({ partner_id: '', destination_url: '', surface: 'bio' }); }}
                                                        className="px-4 py-2 border border-borderSubtle text-inkLight text-sm font-bold rounded-xl hover:text-ink transition-colors"
                                                    >Cancel</button>
                                                </div>
                                            </div>
                                        )}

                                        <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                            {ltLinksLoading ? (
                                                <div className="flex items-center gap-2 py-12 justify-center text-inkLight">
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                </div>
                                            ) : ltLinks.length === 0 ? (
                                                <p className="text-center text-inkLight text-sm py-12">No links yet.</p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                            <th className="text-left px-5 py-3">Shortcode</th>
                                                            <th className="text-left px-5 py-3">Partner</th>
                                                            <th className="text-left px-5 py-3">Surface</th>
                                                            <th className="text-left px-5 py-3">Destination</th>
                                                            <th className="text-right px-5 py-3">Clicks</th>
                                                            <th className="text-left px-5 py-3">Status</th>
                                                            <th className="px-5 py-3" />
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-borderSubtle/50">
                                                        {ltLinks.map(link => (
                                                            <tr key={link.id} className="hover:bg-surface/50 transition-colors">
                                                                <td className="px-5 py-3 font-mono text-xs text-gold">{link.shortcode}</td>
                                                                <td className="px-5 py-3 text-ink">{link.partner_name}</td>
                                                                <td className="px-5 py-3 text-inkLight capitalize">{link.surface}</td>
                                                                <td className="px-5 py-3 max-w-xs truncate text-inkLight text-xs">{link.destination_url}</td>
                                                                <td className="px-5 py-3 text-right font-bold text-ink">{link.total_clicks?.toLocaleString() ?? '—'}</td>
                                                                <td className="px-5 py-3">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                                        link.active ? 'bg-green-100 text-green-700' : 'bg-surface text-inkLight'
                                                                    }`}>{link.active ? 'Active' : 'Inactive'}</span>
                                                                </td>
                                                                <td className="px-5 py-3 text-right">
                                                                    <button
                                                                        onClick={async () => {
                                                                            setLtLinkStatsShortcode(link.shortcode);
                                                                            setLtLinkStatsLoading(true);
                                                                            try {
                                                                                const stats = await fetchLTLinkStats(link.shortcode);
                                                                                setLtLinkStatsModal(stats);
                                                                            } catch (err: any) {
                                                                                toast.error('Failed to load stats: ' + err.message);
                                                                            } finally {
                                                                                setLtLinkStatsLoading(false);
                                                                            }
                                                                        }}
                                                                        className="text-xs text-inkLight hover:text-gold font-bold transition-colors"
                                                                    >{ltLinkStatsLoading && ltLinkStatsShortcode === link.shortcode ? '…' : 'Stats'}</button>
                                                                </td>
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
                                                <input
                                                    type="text"
                                                    placeholder="Key name"
                                                    value={ltNewKeyForm.name}
                                                    onChange={e => setLtNewKeyForm(f => ({ ...f, name: e.target.value }))}
                                                    className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                                />
                                                <select
                                                    value={ltNewKeyForm.scope}
                                                    onChange={e => setLtNewKeyForm(f => ({ ...f, scope: e.target.value }))}
                                                    className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                                >
                                                    <option value="admin">admin</option>
                                                    <option value="write">write</option>
                                                    <option value="read">read</option>
                                                    <option value="partner-read">partner-read</option>
                                                </select>
                                                <select
                                                    value={ltNewKeyForm.partner_id}
                                                    onChange={e => setLtNewKeyForm(f => ({ ...f, partner_id: e.target.value }))}
                                                    className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                                >
                                                    <option value="">No partner (global)</option>
                                                    {ltPartners.map(p => (
                                                        <option key={p.id} value={String(p.id)}>{p.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={async () => {
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
                                                }}
                                                disabled={ltKeySaving || !ltNewKeyForm.name}
                                                className="px-4 py-2 bg-gold text-canvas text-sm font-black rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50"
                                            >{ltKeySaving ? 'Generating…' : 'Generate Key'}</button>
                                        </div>

                                        <div className="bg-canvas border border-borderSubtle rounded-2xl overflow-hidden">
                                            {ltKeysLoading ? (
                                                <div className="flex items-center gap-2 py-12 justify-center text-inkLight">
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                </div>
                                            ) : ltKeys.length === 0 ? (
                                                <p className="text-center text-inkLight text-sm py-12">No API keys yet.</p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-xs text-inkLight font-black uppercase tracking-widest border-b border-borderSubtle">
                                                            <th className="text-left px-5 py-3">Name</th>
                                                            <th className="text-left px-5 py-3">Scope</th>
                                                            <th className="text-left px-5 py-3">Partner</th>
                                                            <th className="text-left px-5 py-3">Last Used</th>
                                                            <th className="text-left px-5 py-3">Created</th>
                                                            <th className="px-5 py-3" />
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-borderSubtle/50">
                                                        {ltKeys.map(k => (
                                                            <tr key={k.id} className="hover:bg-surface/50 transition-colors">
                                                                <td className="px-5 py-3 font-bold text-ink">{k.name}</td>
                                                                <td className="px-5 py-3">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                                                                        k.scope === 'admin' ? 'bg-red-100 text-red-700'
                                                                        : k.scope === 'write' ? 'bg-blue-100 text-blue-700'
                                                                        : 'bg-surface text-inkLight'
                                                                    }`}>{k.scope}</span>
                                                                </td>
                                                                <td className="px-5 py-3 text-inkLight">{k.partner_name ?? '—'}</td>
                                                                <td className="px-5 py-3 text-inkLight text-xs">{k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}</td>
                                                                <td className="px-5 py-3 text-inkLight text-xs">{timeAgo(k.created_at)}</td>
                                                                <td className="px-5 py-3 text-right">
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!window.confirm(`Delete key "${k.name}"?`)) return;
                                                                            try {
                                                                                await deleteLTKey(k.id);
                                                                                setLtKeys(prev => prev.filter(x => x.id !== k.id));
                                                                                toast.success('Key deleted');
                                                                            } catch (err: any) {
                                                                                toast.error(err.message || 'Failed to delete key');
                                                                            }
                                                                        }}
                                                                        className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                                                                    >Delete</button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
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
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-sm p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <p className="font-black text-ink text-lg">Edit Partner</p>
                                <button onClick={() => setLtEditingPartner(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-inkLight" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Name</label>
                                    <input
                                        type="text"
                                        value={ltPartnerForm.name}
                                        onChange={e => setLtPartnerForm(f => ({ ...f, name: e.target.value }))}
                                        className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold/60"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-inkLight uppercase tracking-widest mb-1.5">Slug</label>
                                    <input
                                        type="text"
                                        value={ltPartnerForm.slug}
                                        onChange={e => setLtPartnerForm(f => ({ ...f, slug: e.target.value }))}
                                        className="w-full bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink font-mono focus:outline-none focus:border-gold/60"
                                    />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <div>
                                        <p className="font-bold text-ink text-sm">Active</p>
                                        <p className="text-xs text-inkLight">Inactive partners cannot receive clicks</p>
                                    </div>
                                    <button
                                        onClick={() => setLtPartnerForm(f => ({ ...f, active: !f.active }))}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${ltPartnerForm.active ? 'bg-gold' : 'bg-borderSubtle'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ltPartnerForm.active ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={async () => {
                                        if (!ltEditingPartner) return;
                                        setLtPartnerSaving(true);
                                        try {
                                            await updateLTPartner(ltEditingPartner.id, ltPartnerForm);
                                            setLtPartners(prev => prev.map(p => p.id === ltEditingPartner.id ? { ...p, ...ltPartnerForm } : p));
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

            {/* Link Tracker — Link Stats Modal */}
            <AnimatePresence>
                {ltLinkStatsModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                        onClick={() => setLtLinkStatsModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-canvas border border-borderSubtle rounded-3xl shadow-2xl w-full max-w-md p-8"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <p className="font-black text-ink text-lg font-mono">{ltLinkStatsModal.shortcode}</p>
                                    <p className="text-xs text-inkLight">Link statistics</p>
                                </div>
                                <button onClick={() => setLtLinkStatsModal(null)} className="p-1.5 hover:bg-surface rounded-lg transition-colors">
                                    <X className="w-4 h-4 text-inkLight" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-surface rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-black text-ink">{ltLinkStatsModal.total_clicks.toLocaleString()}</p>
                                    <p className="text-xs text-inkLight font-bold mt-1">Total Clicks</p>
                                </div>
                                <div className="bg-surface rounded-2xl p-4 text-center">
                                    <p className="text-3xl font-black text-ink">{ltLinkStatsModal.unique_ips.toLocaleString()}</p>
                                    <p className="text-xs text-inkLight font-bold mt-1">Unique IPs</p>
                                </div>
                            </div>
                            {Object.keys(ltLinkStatsModal.clicks_by_country).length > 0 && (
                                <div>
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-3">By Country</p>
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                        {Object.entries(ltLinkStatsModal.clicks_by_country)
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 10)
                                            .map(([country, count]) => (
                                                <div key={country} className="flex items-center justify-between text-sm">
                                                    <span className="text-ink font-bold">{country}</span>
                                                    <span className="text-inkLight">{(count as number).toLocaleString()}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
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
