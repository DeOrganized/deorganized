import React, { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { createCommunity } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

interface Props {
    onNavigate: (page: any, id?: string | number) => void;
}

export const CreateCommunity: React.FC<Props> = ({ onNavigate }) => {
    const { accessToken, isBackendAuthenticated } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [avatar, setAvatar] = useState<File | null>(null);
    const [banner, setBanner] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isBackendAuthenticated) {
        return (
            <div className="max-w-xl mx-auto px-4 py-16 text-center text-inkLight">
                Connect your wallet to create a community.
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !name.trim()) return;
        setLoading(true);
        setError('');
        try {
            const data = new FormData();
            data.append('name', name.trim());
            data.append('description', description.trim());
            if (avatar) data.append('avatar', avatar);
            if (banner) data.append('banner', banner);
            const community = await createCommunity(data, accessToken);
            onNavigate('community-page', community.slug);
        } catch (err) {
            setError('Failed to create community. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto px-4 py-12">
            <button
                onClick={() => onNavigate('communities')}
                className="flex items-center gap-2 text-inkLight hover:text-ink text-sm mb-8 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Back to communities
            </button>

            <h1 className="text-2xl font-black text-ink mb-8">Create a community</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Name *</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        maxLength={100}
                        required
                        className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-2xl text-sm text-ink placeholder:text-inkLight focus:outline-none focus:border-gold"
                        placeholder="Your community name"
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
                        <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Avatar</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
                            className="w-full text-xs text-inkLight file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-surface file:text-ink"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-inkLight uppercase tracking-wider mb-2">Banner</label>
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
                    disabled={loading || !name.trim()}
                    className="w-full bg-gold text-black py-3 rounded-2xl font-black text-sm hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create community'}
                </button>
            </form>
        </div>
    );
};
