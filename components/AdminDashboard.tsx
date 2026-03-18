import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Radio, Calendar, Newspaper, MessageSquare, Heart,
    UserPlus, TrendingUp, Shield, CheckCircle, XCircle,
    Search, ChevronLeft, ChevronRight, AlertCircle,
    BarChart3, Eye, Clock, Filter, RefreshCw, Star,
    ShoppingBag, Send, Zap, Settings, Layout, Globe, Bot, X, ExternalLink
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { API_BASE_URL, adminDapGrant } from '../lib/api';
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

// ============================================
// Component
// ============================================

type AdminTab = 'overview' | 'users' | 'feedback' | 'playout' | 'agent-controller' | 'news-production' | 'settings';

const ADMIN_VALID_TABS: AdminTab[] = ['overview', 'users', 'feedback', 'playout', 'agent-controller', 'news-production', 'settings'];

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

    // Grant DAP state (inside permissions modal)
    const [grantAmount, setGrantAmount] = useState('');
    const [grantDescription, setGrantDescription] = useState('');
    const [grantSaving, setGrantSaving] = useState(false);

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

    // Feedback tab state
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [feedbackCount, setFeedbackCount] = useState(0);
    const [feedbackPage, setFeedbackPage] = useState(1);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [editingNote, setEditingNote] = useState<number | null>(null);
    const [noteText, setNoteText] = useState('');

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
        { id: 'feedback' as AdminTab, label: 'User Feedback', icon: MessageSquare },
        { id: 'playout' as AdminTab, label: 'Playout Engine', icon: Radio },
        { id: 'agent-controller' as AdminTab, label: 'Agent Controller', icon: Bot },
        { id: 'news-production' as AdminTab, label: 'News Production', icon: Newspaper },
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
                        activeTab === 'playout' || activeTab === 'agent-controller' || activeTab === 'news-production' ? 'hidden' : ''
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

                            {/* Grant DAP Credits */}
                            {managingUser.stacks_address && (
                                <div className="mt-5 pt-5 border-t border-borderSubtle">
                                    <p className="text-xs font-black text-inkLight uppercase tracking-widest mb-3">Grant DAP Credits</p>
                                    <div className="flex gap-2 mb-2">
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
                                    <button
                                        onClick={handleGrantDap}
                                        disabled={grantSaving || !grantAmount}
                                        className="w-full py-2.5 border-2 border-dashed border-gold/40 rounded-xl text-sm font-bold text-gold hover:border-gold hover:bg-gold/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                        {grantSaving ? 'Granting…' : 'Grant Credits'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
