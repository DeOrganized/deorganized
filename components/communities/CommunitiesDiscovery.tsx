import React, { useState, useEffect } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { getCommunities, Community } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { CommunityCard } from './CommunityCard';

interface Props {
    onNavigate: (page: any, id?: string | number) => void;
}

export const CommunitiesDiscovery: React.FC<Props> = ({ onNavigate }) => {
    const { isBackendAuthenticated } = useAuth();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');

    useEffect(() => {
        setLoading(true);
        getCommunities(query ? { search: query } : undefined)
            .then((data) => setCommunities(data.results))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [query]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setQuery(search);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-ink mb-1">Communities</h1>
                    <p className="text-inkLight">Find your people.</p>
                </div>
                {isBackendAuthenticated && (
                    <button
                        onClick={() => onNavigate('create-community')}
                        className="flex items-center gap-2 bg-gold text-black px-4 py-2 rounded-2xl text-sm font-black hover:bg-gold/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create
                    </button>
                )}
            </div>

            <form onSubmit={handleSearch} className="mb-8">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search communities..."
                        className="w-full pl-9 pr-4 py-2.5 bg-surface border border-borderSubtle rounded-2xl text-sm text-ink placeholder:text-inkLight focus:outline-none focus:border-gold"
                    />
                </div>
            </form>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-gold" />
                </div>
            ) : communities.length === 0 ? (
                <div className="text-center py-16 text-inkLight">
                    {query ? `No communities found for "${query}"` : 'No communities yet.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {communities.map((c) => (
                        <CommunityCard key={c.id} community={c} onNavigate={onNavigate} />
                    ))}
                </div>
            )}
        </div>
    );
};
