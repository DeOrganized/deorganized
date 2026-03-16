import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Edit2, Calendar, Clock, Link as LinkIcon, 
    ChevronDown, ChevronUp, Loader2, Save, X, Film, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShowEpisode, createEpisode, updateEpisode, deleteEpisode, fetchEpisodes } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useToast } from './Toast';

interface EpisodeManagerProps {
    showId: number;
    initialEpisodes?: ShowEpisode[];
    isOwner?: boolean;
}

const EpisodeManager: React.FC<EpisodeManagerProps> = ({ showId, initialEpisodes = [], isOwner = true }) => {
    const { accessToken } = useAuth();
    const toast = useToast();
    const [episodes, setEpisodes] = useState<ShowEpisode[]>(initialEpisodes);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null); // ID or -1 for adding

    const [formData, setFormData] = useState<Partial<ShowEpisode>>({
        show: showId,
        episode_number: (episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number)) + 1 : 1),
        title: '',
        description: '',
        air_date: new Date().toISOString().split('T')[0],
        duration: '',
        video_url: '',
        is_premium: false,
        price_stx: 0,
        price_usdcx: 0
    });

    useEffect(() => {
        if (initialEpisodes && initialEpisodes.length > 0) {
            setEpisodes(initialEpisodes);
        } else {
            loadEpisodes();
        }
    }, [showId]);

    const loadEpisodes = async () => {
        setLoading(true);
        try {
            const data = await fetchEpisodes(showId);
            setEpisodes(data);
        } catch (err) {
            console.error('Failed to load episodes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;
        setActionLoading(-1);
        try {
            const newEp = await createEpisode(formData, accessToken);
            setEpisodes(prev => [newEp, ...prev].sort((a, b) => b.episode_number - a.episode_number));
            setIsAdding(false);
            resetForm();
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpdate = async (id: number) => {
        if (!accessToken) return;
        setActionLoading(id);
        try {
            const updatedEp = await updateEpisode(id, formData, accessToken);
            setEpisodes(prev => prev.map(e => e.id === id ? updatedEp : e));
            setEditingId(null);
            resetForm();
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!accessToken || !window.confirm('Are you sure you want to delete this episode?')) return;
        setActionLoading(id);
        try {
            await deleteEpisode(id, accessToken);
            setEpisodes(prev => prev.filter(e => e.id !== id));
        } catch (err: any) {
            toast.error(`Error: ${err.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const resetForm = () => {
        setFormData({
            show: showId,
            episode_number: (episodes.length > 0 ? Math.max(...episodes.map(e => e.episode_number)) + 1 : 1),
            title: '',
            description: '',
            air_date: new Date().toISOString().split('T')[0],
            duration: '',
            video_url: '',
            is_premium: false,
            price_stx: 0,
            price_usdcx: 0
        });
    };

    const startEditing = (ep: ShowEpisode) => {
        setEditingId(ep.id);
        setFormData(ep);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-ink">Show Episodes</h3>
                {isOwner && (
                    <button
                        onClick={() => {
                            setIsAdding(!isAdding);
                            setEditingId(null);
                            resetForm();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-gold text-background rounded-xl text-sm font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
                    >
                        {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isAdding ? 'Cancel' : 'Add Episode'}
                    </button>
                )}
            </div>

            {/* Add/Edit Form */}
            <AnimatePresence>
                {(isAdding || editingId) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <form 
                            onSubmit={editingId ? (e) => { e.preventDefault(); handleUpdate(editingId); } : handleCreate}
                            className="p-6 bg-surface border border-gold/20 rounded-2xl space-y-4 mb-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Episode #</label>
                                    <input 
                                        type="number"
                                        value={formData.episode_number}
                                        onChange={e => setFormData({...formData, episode_number: parseInt(e.target.value)})}
                                        className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Title</label>
                                    <input 
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({...formData, title: e.target.value})}
                                        className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all"
                                        placeholder="Episode Title"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Air Date</label>
                                    <input 
                                        type="date"
                                        value={formData.air_date}
                                        onChange={e => setFormData({...formData, air_date: e.target.value})}
                                        className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Duration (Optional)</label>
                                    <input 
                                        type="text"
                                        value={formData.duration || ''}
                                        onChange={e => setFormData({...formData, duration: e.target.value})}
                                        className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all"
                                        placeholder="HH:MM:SS"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Description</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all min-h-[100px]"
                                    placeholder="What's this episode about?"
                                />
                            </div>

                            <div className="p-4 bg-gold/5 border border-gold/10 rounded-2xl space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${formData.is_premium ? 'bg-gold' : 'bg-ink/20'}`}
                                            onClick={() => setFormData({...formData, is_premium: !formData.is_premium})}>
                                            <div className={`absolute top-1 w-4 h-4 bg-background rounded-full transition-all ${formData.is_premium ? 'left-5' : 'left-1'}`} />
                                        </div>
                                        <span className="text-sm font-bold text-ink">Premium Gated Episode</span>
                                    </div>
                                    <Crown className={`w-5 h-5 ${formData.is_premium ? 'text-gold' : 'text-ink/20'}`} />
                                </div>

                                {formData.is_premium && (
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gold/10">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Price (STX)</label>
                                            <input 
                                                type="number"
                                                step="0.000001"
                                                value={(formData.price_stx || 0) / 1000000}
                                                onChange={e => setFormData({...formData, price_stx: Math.round(parseFloat(e.target.value) * 1000000)})}
                                                className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-inkLight uppercase tracking-wider">Price (USDCx)</label>
                                            <input 
                                                type="number"
                                                step="0.000001"
                                                value={(formData.price_usdcx || 0) / 1000000}
                                                onChange={e => setFormData({...formData, price_usdcx: Math.round(parseFloat(e.target.value) * 1000000)})}
                                                className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Episode URL / Link */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-inkLight uppercase tracking-wider flex items-center gap-1">
                                    <LinkIcon className="w-3 h-3" /> Episode Link (Optional)
                                </label>
                                <input 
                                    type="url"
                                    value={formData.video_url || ''}
                                    onChange={e => setFormData({...formData, video_url: e.target.value})}
                                    className="w-full bg-transparent border border-borderSubtle rounded-xl p-3 text-ink focus:border-gold outline-none transition-all"
                                    placeholder="https://youtube.com/watch?v=..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingId(null); }}
                                    className="px-4 py-2 text-sm font-bold text-inkLight hover:text-ink transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={actionLoading !== null}
                                    className="flex items-center gap-2 px-6 py-2 bg-gold text-background rounded-xl text-sm font-bold hover:bg-gold/90 transition-all"
                                >
                                    {actionLoading === -1 || (editingId && actionLoading === editingId) ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    {editingId ? 'Update Episode' : 'Save Episode'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-gold animate-spin" />
                </div>
            ) : episodes.length === 0 ? (
                <div className="p-12 text-center bg-surface/50 border border-dashed border-borderSubtle rounded-3xl">
                    <Film className="w-12 h-12 text-inkLight/20 mx-auto mb-4" />
                    <p className="text-inkLight">No episodes recorded yet.</p>
                    <p className="text-xs text-inkLight/60 mt-2">Start adding episodes to build your show archive.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {episodes.map((ep) => (
                        <motion.div
                            key={ep.id}
                            layout
                            className="group relative p-5 bg-surface border border-borderSubtle hover:border-gold/30 rounded-2xl transition-all"
                        >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="px-2 py-0.5 bg-gold/10 text-gold text-[10px] font-black uppercase rounded">
                                            EP {ep.episode_number}
                                        </span>
                                        <span className="text-xs text-inkLight flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {ep.air_date}
                                        </span>
                                        {ep.duration && (
                                            <span className="text-xs text-inkLight flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {ep.duration}
                                            </span>
                                        )}
                                        {ep.is_premium && (
                                            <span className="text-xs text-gold flex items-center gap-1 font-black">
                                                <Crown className="w-3 h-3" />
                                                PREMIUM
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-lg font-bold text-ink truncate group-hover:text-gold transition-colors">
                                        {ep.title}
                                    </h4>
                                    <p className="text-sm text-inkLight line-clamp-2 mt-1">
                                        {ep.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {ep.video_url && (
                                        <a 
                                            href={ep.video_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-2.5 rounded-xl bg-ink/5 text-inkLight hover:text-gold hover:bg-gold/5 transition-all"
                                            title="Watch Video"
                                        >
                                            <Film className="w-5 h-5" />
                                        </a>
                                    )}
                                    {isOwner ? (
                                        <>
                                            <button
                                                onClick={() => startEditing(ep)}
                                                className="p-2.5 rounded-xl bg-surface text-inkLight hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                                                title="Edit Episode"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(ep.id)}
                                                disabled={actionLoading === ep.id}
                                                className="p-2.5 rounded-xl bg-surface text-inkLight hover:text-red-500 hover:bg-red-500/10 transition-all"
                                                title="Delete Episode"
                                            >
                                                {actionLoading === ep.id ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-5 h-5" />
                                                )}
                                            </button>
                                        </>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/10 border border-gold/20 rounded-lg">
                                            <Crown className="w-3.5 h-3.5 text-gold" />
                                            <span className="text-[10px] font-black text-gold uppercase tracking-wider">Host Only</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EpisodeManager;
