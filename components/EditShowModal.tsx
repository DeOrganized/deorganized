import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2, Upload, Search, UserPlus, Crown, Users, Trash2 } from 'lucide-react';
import { Show, updateShow, deleteShow, CreateShowPayload, UpdateShowPayload, Tag, searchCreators } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { TagInput } from './TagInput';

interface EditShowModalProps {
    show: Show;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    isOwner?: boolean;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
];

interface UserInfo {
    id: number;
    username: string;
    profile_picture: string | null;
    is_verified?: boolean;
}

export const EditShowModal: React.FC<EditShowModalProps> = ({ show, isOpen, onClose, onSuccess, isOwner = true }) => {
    const { backendUser, accessToken } = useAuth();
    const [formData, setFormData] = useState({
        title: show.title,
        description: show.description,
        thumbnail: null as File | null,
        is_recurring: show.is_recurring,
        recurrence_type: show.recurrence_type || undefined,
        day_of_week: show.day_of_week ?? undefined,
        scheduled_time: show.scheduled_time || '',
        status: show.status as 'draft' | 'published' | 'archived',
        tags: show.tags || [] as Tag[],
        external_link: show.external_link || '',
        link_platform: show.link_platform || ''
    });

    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(show.thumbnail);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Co-host state
    const [coHosts, setCoHosts] = useState<UserInfo[]>(show.co_hosts || []);
    const [coHostSearch, setCoHostSearch] = useState('');
    const [coHostResults, setCoHostResults] = useState<UserInfo[]>([]);
    const [searchingCoHosts, setSearchingCoHosts] = useState(false);
    const [showCoHostDropdown, setShowCoHostDropdown] = useState(false);
    const coHostSearchRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset form when show changes
    useEffect(() => {
        setFormData({
            title: show.title,
            description: show.description,
            thumbnail: null,
            is_recurring: show.is_recurring,
            recurrence_type: show.recurrence_type || undefined,
            day_of_week: show.day_of_week ?? undefined,
            scheduled_time: show.scheduled_time || '',
            status: show.status as 'draft' | 'published' | 'archived',
            tags: show.tags || [],
            external_link: show.external_link || '',
            link_platform: show.link_platform || ''
        });
        setThumbnailPreview(show.thumbnail);
        setCoHosts(show.co_hosts || []);
        setError(null);
    }, [show]);

    // Close co-host dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (coHostSearchRef.current && !coHostSearchRef.current.contains(e.target as Node)) {
                setShowCoHostDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({ ...formData, thumbnail: file });
            const reader = new FileReader();
            reader.onloadend = () => {
                setThumbnailPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Co-host search with debounce
    const handleCoHostSearch = (query: string) => {
        setCoHostSearch(query);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (query.trim().length < 2) {
            setCoHostResults([]);
            setShowCoHostDropdown(false);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setSearchingCoHosts(true);
            try {
                const results = await searchCreators(query);
                // Filter out the show creator and already-added co-hosts
                const filteredResults = results.filter(
                    (r: any) => r.id !== show.creator.id && !coHosts.some(c => c.id === r.id)
                );
                setCoHostResults(filteredResults);
                setShowCoHostDropdown(true);
            } catch (err) {
                console.error('Co-host search failed:', err);
            } finally {
                setSearchingCoHosts(false);
            }
        }, 300);
    };

    const addCoHost = (userInfo: UserInfo) => {
        setCoHosts(prev => [...prev, userInfo]);
        setCoHostSearch('');
        setCoHostResults([]);
        setShowCoHostDropdown(false);
    };

    const removeCoHost = (userId: number) => {
        setCoHosts(prev => prev.filter(c => c.id !== userId));
    };

    const removeGuest = (guestId: number) => {
        // We'll handle guest removal by updating the show's guests through the backend
        // For now, we track which guests to remove
    };

    const handleDelete = async () => {
        if (!accessToken) return;
        if (!window.confirm(`Are you sure you want to delete "${show.title}"? This action cannot be undone.`)) {
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);
            await deleteShow(show.slug, accessToken);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to delete show');
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;

        // Validation
        if (!formData.title.trim() || formData.title.length < 3) {
            setError('Title must be at least 3 characters');
            return;
        }

        if (!formData.description.trim() || formData.description.length < 10) {
            setError('Description must be at least 10 characters');
            return;
        }

        if (formData.is_recurring) {
            if (!formData.recurrence_type) {
                setError('Please select a recurrence pattern');
                return;
            }
            if (formData.recurrence_type === 'SPECIFIC_DAY' && formData.day_of_week === undefined) {
                setError('Please select a day of the week for specific day recurrence');
                return;
            }
            if (!formData.scheduled_time) {
                setError('Please select a time for recurring shows');
                return;
            }
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const payload: UpdateShowPayload = {
                title: formData.title,
                description: formData.description,
                is_recurring: formData.is_recurring,
                status: formData.status,
                tag_ids: formData.tags.map(t => t.id),
                external_link: formData.external_link,
                link_platform: formData.link_platform as any,
                co_host_ids: coHosts.map(c => c.id),
            };

            if (formData.thumbnail) {
                payload.thumbnail = formData.thumbnail;
            }
            if (formData.is_recurring) {
                payload.recurrence_type = formData.recurrence_type;
                if (formData.recurrence_type === 'SPECIFIC_DAY') {
                    payload.day_of_week = formData.day_of_week;
                }
                payload.scheduled_time = formData.scheduled_time;
            }

            await updateShow(show.slug, payload, accessToken);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update show');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-canvas rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-canvas border-b border-borderSubtle px-8 py-6 flex items-center justify-between rounded-t-3xl z-10">
                    <h2 className="text-2xl font-bold text-ink">Edit Show</h2>
                    <button
                        onClick={onClose}
                        className="text-inkLight hover:text-ink transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Co-host Restriction Overlay */}
                {!isOwner && (
                    <div className="absolute inset-x-0 bottom-0 top-[89px] bg-canvas/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 rounded-b-3xl">
                        <div className="bg-surface border border-gold/30 p-10 rounded-3xl shadow-2xl max-w-md text-center space-y-6">
                            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mx-auto">
                                <Crown className="w-10 h-10 text-gold" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-ink">Co-host View Only</h3>
                                <p className="text-inkLight font-medium">
                                    Seems you're a co-host, you can't edit this. <br />
                                    <span className="text-gold">Contact the host of the show</span> to make changes.
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-full py-3 bg-canvas text-ink font-bold rounded-xl border border-borderSubtle hover:border-gold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-700 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">
                            Show Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Bitcoin Deep Dive"
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                            placeholder="Describe your show..."
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
                            required
                        />
                    </div>

                    {/* Thumbnail */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">Thumbnail</label>
                        <div className="flex items-center gap-4">
                            {thumbnailPreview && (
                                <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-borderSubtle">
                                    <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-surface border border-borderSubtle rounded-xl cursor-pointer hover:bg-surface-hover transition-colors">
                                <Upload className="w-5 h-5 text-inkLight" />
                                <span className="text-sm text-inkLight">
                                    {formData.thumbnail ? formData.thumbnail.name : 'Upload new thumbnail (optional)'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">Tags</label>
                        <TagInput
                            selectedTags={formData.tags}
                            onChange={(tags) => setFormData({ ...formData, tags })}
                            placeholder="Add tags (Bitcoin, Stacks, etc.)"
                        />
                    </div>

                    {/* Co-Hosts */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">
                            <Crown className="w-4 h-4 inline-block mr-1 text-gold" />
                            Co-Hosts
                        </label>
                        <p className="text-xs text-inkLight mb-3">
                            Co-hosts share this show on their profile and receive show notifications.
                        </p>

                        {/* Current co-hosts */}
                        {coHosts.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {coHosts.map((coHost) => (
                                    <div
                                        key={coHost.id}
                                        className="flex items-center gap-2 bg-gold/10 border border-gold/30 rounded-full pl-1 pr-2 py-1"
                                    >
                                        <img
                                            src={coHost.profile_picture || '/default-avatar.png'}
                                            alt={coHost.username}
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                        <span className="text-sm font-medium text-ink">{coHost.username}</span>
                                        {coHost.is_verified && (
                                            <span className="text-gold text-xs">✓</span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeCoHost(coHost.id)}
                                            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 text-inkLight hover:text-red-500 transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Co-host search */}
                        <div className="relative" ref={coHostSearchRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight" />
                                <input
                                    type="text"
                                    value={coHostSearch}
                                    onChange={(e) => handleCoHostSearch(e.target.value)}
                                    onFocus={() => coHostResults.length > 0 && setShowCoHostDropdown(true)}
                                    placeholder="Search creators to add as co-host..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-surface border border-borderSubtle rounded-xl text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                                />
                                {searchingCoHosts && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight animate-spin" />
                                )}
                            </div>

                            {/* Search results dropdown */}
                            {showCoHostDropdown && coHostResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-canvas border border-borderSubtle rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                                    {coHostResults.map((result) => (
                                        <button
                                            key={result.id}
                                            type="button"
                                            onClick={() => addCoHost(result)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors first:rounded-t-xl last:rounded-b-xl"
                                        >
                                            <img
                                                src={result.profile_picture || '/default-avatar.png'}
                                                alt={result.username}
                                                className="w-8 h-8 rounded-full object-cover"
                                            />
                                            <div className="text-left">
                                                <span className="text-sm font-medium text-ink">{result.username}</span>
                                                {result.is_verified && (
                                                    <span className="ml-1 text-gold text-xs">✓</span>
                                                )}
                                            </div>
                                            <UserPlus className="w-4 h-4 text-inkLight ml-auto" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {showCoHostDropdown && coHostSearch.trim().length >= 2 && coHostResults.length === 0 && !searchingCoHosts && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-canvas border border-borderSubtle rounded-xl shadow-lg z-20 px-4 py-3">
                                    <p className="text-sm text-inkLight">No creators found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Current Guests (read-only display) */}
                    {show.guests && show.guests.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-ink mb-2">
                                <Users className="w-4 h-4 inline-block mr-1 text-inkLight" />
                                Featured Guests ({show.guests.length})
                            </label>
                            <p className="text-xs text-inkLight mb-3">
                                Guests are added through the guest request workflow on your show page.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {show.guests.map((guest) => (
                                    <div
                                        key={guest.id}
                                        className="flex items-center gap-2 bg-surface border border-borderSubtle rounded-full pl-1 pr-3 py-1"
                                    >
                                        <img
                                            src={guest.profile_picture || '/default-avatar.png'}
                                            alt={guest.username}
                                            className="w-6 h-6 rounded-full object-cover"
                                        />
                                        <span className="text-sm font-medium text-ink">{guest.username}</span>
                                        {guest.is_verified && (
                                            <span className="text-gold text-xs">✓</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* External Link (Watch Now) */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">
                            Watch Now Link <span className="text-inkLight/50 font-normal">(Optional)</span>
                        </label>
                        <div className="space-y-3">
                            <select
                                value={formData.link_platform}
                                onChange={(e) => setFormData({ ...formData, link_platform: e.target.value as any })}
                                className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors text-ink"
                            >
                                <option value="">Select Platform</option>
                                <option value="youtube">YouTube</option>
                                <option value="twitter">Twitter/X</option>
                                <option value="twitch">Twitch</option>
                                <option value="rumble">Rumble</option>
                                <option value="kick">Kick</option>
                                <option value="other">Other</option>
                            </select>
                            <input
                                type="url"
                                value={formData.external_link}
                                onChange={(e) => setFormData({ ...formData, external_link: e.target.value })}
                                placeholder="https://youtube.com/watch?v=..."
                                className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Schedule */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">Schedule</label>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_recurring}
                                    onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                                    className="w-5 h-5 rounded border-borderSubtle text-gold focus:ring-gold"
                                />
                                <span className="text-sm font-medium text-ink">This is a recurring show</span>
                            </label>

                            {formData.is_recurring && (
                                <div className="space-y-4 p-4 bg-surface/50 rounded-xl border border-borderSubtle">
                                    <div>
                                        <label className="block text-sm font-bold text-ink mb-2">Recurrence Pattern</label>
                                        <select
                                            value={formData.recurrence_type || ''}
                                            onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any || undefined })}
                                            className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors text-ink"
                                        >
                                            <option value="">Select pattern</option>
                                            <option value="DAILY">Daily</option>
                                            <option value="SPECIFIC_DAY">Specific Day</option>
                                            <option value="WEEKDAYS">Weekdays (Mon-Fri)</option>
                                            <option value="WEEKENDS">Weekends (Sat-Sun)</option>
                                        </select>
                                    </div>

                                    {formData.recurrence_type === 'SPECIFIC_DAY' && (
                                        <div>
                                            <label className="block text-sm font-bold text-ink mb-2">Day of Week</label>
                                            <select
                                                value={formData.day_of_week ?? ''}
                                                onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value ? parseInt(e.target.value) : undefined })}
                                                className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors text-ink"
                                            >
                                                <option value="">Select day</option>
                                                {DAYS_OF_WEEK.map(day => (
                                                    <option key={day.value} value={day.value}>{day.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-ink mb-2">Time</label>
                                        <input
                                            type="time"
                                            value={formData.scheduled_time}
                                            onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">Status</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="status"
                                    value="draft"
                                    checked={formData.status === 'draft'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
                                    className="w-4 h-4 text-gold focus:ring-gold"
                                />
                                <span className="text-sm font-medium text-ink">Draft</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="status"
                                    value="published"
                                    checked={formData.status === 'published'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
                                    className="w-4 h-4 text-gold focus:ring-gold"
                                />
                                <span className="text-sm font-medium text-ink">Published</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="status"
                                    value="archived"
                                    checked={formData.status === 'archived'}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' | 'archived' })}
                                    className="w-4 h-4 text-gold focus:ring-gold"
                                />
                                <span className="text-sm font-medium text-ink">Archived</span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            className="flex-1 bg-red-50 text-red-600 font-bold py-3 rounded-xl border border-red-100 hover:bg-red-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <Trash2 className="w-5 h-5" />
                            Delete Show
                        </button>
                        <div className="flex-1 flex gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 bg-surface text-ink font-bold py-3 rounded-xl border border-borderSubtle hover:bg-surface-hover transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex-1 bg-gold-gradient text-white font-bold py-3 rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
