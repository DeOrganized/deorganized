import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Upload } from 'lucide-react';
import { Event, updateEvent, UpdateEventPayload } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

interface EditEventModalProps {
    event: Event;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
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

export const EditEventModal: React.FC<EditEventModalProps> = ({ event, isOpen, onClose, onSuccess }) => {
    const { accessToken } = useAuth();
    const [formData, setFormData] = useState({
        title: event.title,
        description: event.description,
        banner_image: null as File | null,
        venue_name: event.venue_name || '',
        address: event.address || '',
        is_virtual: event.is_virtual,
        meeting_link: event.meeting_link || '',
        is_public: event.is_public,
        is_recurring: event.is_recurring,
        recurrence_type: event.recurrence_type || undefined,
        day_of_week: event.day_of_week ?? undefined,
        scheduled_time: event.scheduled_time || '',
        start_datetime: event.start_datetime || '',
        end_datetime: event.end_datetime || '',
    });

    const [bannerPreview, setBannerPreview] = useState<string | null>(event.banner_image);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when event changes
    useEffect(() => {
        setFormData({
            title: event.title,
            description: event.description,
            banner_image: null,
            venue_name: event.venue_name || '',
            address: event.address || '',
            is_virtual: event.is_virtual,
            meeting_link: event.meeting_link || '',
            is_public: event.is_public,
            is_recurring: event.is_recurring,
            recurrence_type: event.recurrence_type || undefined,
            day_of_week: event.day_of_week ?? undefined,
            scheduled_time: event.scheduled_time || '',
            start_datetime: event.start_datetime || '',
            end_datetime: event.end_datetime || '',
        });
        setBannerPreview(event.banner_image);
        setError(null);
    }, [event]);

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData(prev => ({ ...prev, banner_image: file }));
            const reader = new FileReader();
            reader.onloadend = () => {
                setBannerPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
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

        // Validate based on event type
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
                setError('Please select a time for recurring events');
                return;
            }
        } else {
            if (!formData.start_datetime) {
                setError('Start date/time is required for one-off events');
                return;
            }
        }

        try {
            setIsSubmitting(true);
            setError(null);

            const payload: UpdateEventPayload = {
                title: formData.title,
                description: formData.description,
                venue_name: formData.venue_name,
                address: formData.address,
                is_virtual: formData.is_virtual,
                meeting_link: formData.meeting_link || undefined,
                is_public: formData.is_public,
                is_recurring: formData.is_recurring,
            };

            if (formData.banner_image) {
                payload.banner_image = formData.banner_image;
            }

            if (formData.is_recurring) {
                payload.recurrence_type = formData.recurrence_type;
                if (formData.recurrence_type === 'SPECIFIC_DAY') {
                    payload.day_of_week = formData.day_of_week;
                }
                payload.scheduled_time = formData.scheduled_time;
            } else {
                payload.start_datetime = formData.start_datetime || undefined;
                payload.end_datetime = formData.end_datetime || undefined;
            }

            await updateEvent(event.id, payload, accessToken);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update event');
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
                    <h2 className="text-2xl font-bold text-ink">Edit Event</h2>
                    <button
                        onClick={onClose}
                        className="text-inkLight hover:text-ink transition-colors"
                        disabled={isSubmitting}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

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
                            Event Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g., Bitcoin Meetup"
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
                            placeholder="Describe your event..."
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
                            required
                        />
                    </div>

                    {/* Banner Image */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">Banner Image</label>
                        <div className="flex items-center gap-4">
                            {bannerPreview && (
                                <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-borderSubtle">
                                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <label className="flex-1 flex items-center gap-3 px-4 py-3 bg-surface border border-borderSubtle rounded-xl cursor-pointer hover:bg-surface-hover transition-colors">
                                <Upload className="w-5 h-5 text-inkLight" />
                                <span className="text-sm text-inkLight">
                                    {formData.banner_image ? formData.banner_image.name : 'Upload new banner (optional)'}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBannerChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>

                    {/* Recurring Event */}
                    <div className="flex items-center gap-3 pt-2">
                        <input
                            type="checkbox"
                            checked={formData.is_recurring}
                            onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                            className="w-5 h-5 rounded border-borderSubtle text-gold focus:ring-2 focus:ring-gold/20"
                        />
                        <label className="text-sm font-bold text-ink">This is a recurring event</label>
                    </div>

                    {/* Date/Time Section - Conditional on is_recurring */}
                    {!formData.is_recurring && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-ink mb-2">Start Date/Time *</label>
                                <input
                                    type="datetime-local"
                                    value={formData.start_datetime}
                                    onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-ink mb-2">End Date/Time</label>
                                <input
                                    type="datetime-local"
                                    value={formData.end_datetime}
                                    onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                                />
                            </div>
                        </div>
                    )}

                    {/* Recurring Details */}
                    {formData.is_recurring && (
                        <div className="space-y-4 pl-8 border-l-2 border-gold/20">
                            {/* Recurrence Pattern */}
                            <div>
                                <label className="block text-sm font-bold text-ink mb-2">Recurrence Pattern</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, recurrence_type: 'DAILY', day_of_week: undefined })}
                                        className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'DAILY'
                                            ? 'bg-gold text-white'
                                            : 'bg-surface border border-borderSubtle text-inkLight hover:border-gold'
                                            }`}
                                    >
                                        Daily
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, recurrence_type: 'WEEKDAYS', day_of_week: undefined })}
                                        className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'WEEKDAYS'
                                            ? 'bg-gold text-white'
                                            : 'bg-surface border border-borderSubtle text-inkLight hover:border-gold'
                                            }`}
                                    >
                                        Weekdays
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, recurrence_type: 'WEEKENDS', day_of_week: undefined })}
                                        className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'WEEKENDS'
                                            ? 'bg-gold text-white'
                                            : 'bg-surface border border-borderSubtle text-inkLight hover:border-gold'
                                            }`}
                                    >
                                        Weekends
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, recurrence_type: 'SPECIFIC_DAY' })}
                                        className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'SPECIFIC_DAY'
                                            ? 'bg-gold text-white'
                                            : 'bg-surface border border-borderSubtle text-inkLight hover:border-gold'
                                            }`}
                                    >
                                        Specific Day
                                    </button>
                                </div>
                            </div>

                            {/* Day of Week - Only if Specific Day */}
                            {formData.recurrence_type === 'SPECIFIC_DAY' && (
                                <div>
                                    <label className="block text-sm font-bold text-ink mb-2">Day of Week</label>
                                    <select
                                        value={formData.day_of_week ?? ''}
                                        onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                                        required
                                    >
                                        <option value="">Select day</option>
                                        {DAYS_OF_WEEK.map(day => (
                                            <option key={day.value} value={day.value}>{day.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Time */}
                            <div>
                                <label className="block text-sm font-bold text-ink mb-2">Time</label>
                                <input
                                    type="time"
                                    value={formData.scheduled_time}
                                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                                    className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Venue */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">Venue Name</label>
                        <input
                            type="text"
                            value={formData.venue_name}
                            onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                            placeholder="e.g., Community Center"
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-bold text-ink mb-2">Address</label>
                        <input
                            type="text"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="123 Main St"
                            className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                        />
                    </div>

                    {/* Virtual Event */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={formData.is_virtual}
                            onChange={(e) => setFormData({ ...formData, is_virtual: e.target.checked })}
                            className="w-5 h-5 rounded border-borderSubtle text-gold focus:ring-2 focus:ring-gold/20"
                        />
                        <label className="text-sm font-bold text-ink">This is a virtual event</label>
                    </div>

                    {formData.is_virtual && (
                        <div>
                            <label className="block text-sm font-bold text-ink mb-2">Meeting Link</label>
                            <input
                                type="url"
                                value={formData.meeting_link}
                                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                                placeholder="https://zoom.us/..."
                                className="w-full px-4 py-3 bg-surface border border-borderSubtle rounded-xl text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                            />
                        </div>
                    )}

                    {/* Public Event */}
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={formData.is_public}
                            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                            className="w-5 h-5 rounded border-borderSubtle text-gold focus:ring-2 focus:ring-gold/20"
                        />
                        <label className="text-sm font-bold text-ink">Make this event public</label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4">
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
                </form>
            </div>
        </div>
    );
};
