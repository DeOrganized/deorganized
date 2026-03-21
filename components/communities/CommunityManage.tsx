import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { Community, MembershipRole, getCommunity, updateCommunity, deleteCommunity, getImageUrl } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

interface Props {
    slug: string;
    onNavigate: (page: any, id?: string | number) => void;
}

export const CommunityManage: React.FC<Props> = ({ slug, onNavigate }) => {
    const { accessToken } = useAuth();

    const [community, setCommunity] = useState<Community | null>(null);
    const [userRole, setUserRole] = useState<MembershipRole | null>(null);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [website, setWebsite] = useState('');
    const [twitter, setTwitter] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [banner, setBanner] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    useEffect(() => {
        getCommunity(slug, accessToken || undefined)
            .then((c) => {
                setCommunity(c);
                setUserRole((c.user_membership?.role as MembershipRole) ?? null);
                setName(c.name);
                setDescription(c.description || '');
                setWebsite(c.website || '');
                setTwitter(c.twitter || '');
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [slug]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-32">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
            </div>
        );
    }

    if (!community || (userRole !== 'founder' && userRole !== 'admin' && userRole !== 'moderator')) {
        return (
            <div className="text-center py-32 text-inkLight">
                You don't have permission to manage this community.
            </div>
        );
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !name.trim()) return;
        setSaving(true);
        setError('');
        try {
            const data = new FormData();
            data.append('name', name.trim());
            data.append('description', description.trim());
            data.append('website', website.trim());
            data.append('twitter', twitter.trim());
            if (avatar) data.append('avatar', avatar);
            if (banner) data.append('banner', banner);
            const updated = await updateCommunity(community.slug, data, accessToken);
            onNavigate('community-page', updated.slug);
        } catch (err) {
            setError('Failed to save changes. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!accessToken) return;
        setDeleting(true);
        try {
            await deleteCommunity(community.slug, accessToken);
            onNavigate('communities');
        } catch (err) {
            setError('Failed to delete community.');
            setDeleting(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-12">
            <button
                onClick={() => onNavigate('community-page', community.slug)}
                className="flex items-center gap-2 text-inkLight hover:text-ink text-sm mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to {community.name}
            </button>

            <h1 className="text-2xl font-black text-ink mb-8">Manage community</h1>

            <form onSubmit={handleSave} className="space-y-5">
                <div>
                    <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        required
                        className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-2xl text-sm text-ink placeholder:text-inkLight focus:outline-none focus:border-gold"
                    />
                </div>

                <div>
                    <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={2000}
                        rows={4}
                        className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-2xl text-sm text-ink placeholder:text-inkLight focus:outline-none focus:border-gold resize-none"
                        placeholder="What's this community about?"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Website</label>
                        <input
                            type="url"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-2xl text-sm text-ink placeholder:text-inkLight focus:outline-none focus:border-gold"
                            placeholder="https://"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Twitter / X</label>
                        <input
                            type="text"
                            value={twitter}
                            onChange={(e) => setTwitter(e.target.value)}
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-2xl text-sm text-ink placeholder:text-inkLight focus:outline-none focus:border-gold"
                            placeholder="@handle"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Avatar</label>
                        {community.avatar && !avatar && (
                            <img
                                src={getImageUrl(community.avatar) || ''}
                                alt="Current avatar"
                                className="w-12 h-12 rounded-xl object-cover mb-2"
                            />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                            className="w-full text-xs text-inkLight file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-surface file:text-ink"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Banner</label>
                        {community.banner && !banner && (
                            <img
                                src={getImageUrl(community.banner) || ''}
                                alt="Current banner"
                                className="w-full h-12 rounded-xl object-cover mb-2"
                            />
                        )}
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setBanner(e.target.files?.[0] || null)}
                            className="w-full text-xs text-inkLight file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-surface file:text-ink"
                        />
                    </div>
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                    type="submit"
                    disabled={saving || !name.trim()}
                    className="w-full bg-gold text-black py-3 rounded-2xl font-black text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
                </button>
            </form>

            {userRole === 'founder' && (
                <div className="mt-12 pt-8 border-t border-borderSubtle">
                    <h2 className="text-sm font-black text-red-500 mb-4">Danger zone</h2>
                    {!confirmDelete ? (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" /> Delete community
                        </button>
                    ) : (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-3">
                            <p className="text-sm text-red-400">
                                This will permanently delete <strong>{community.name}</strong> and all associated data. This cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, delete'}
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-black text-inkLight hover:text-ink transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
