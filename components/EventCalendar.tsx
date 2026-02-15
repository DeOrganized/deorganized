import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar, ChevronLeft, ChevronRight, Clock, MapPin,
    Video, Filter, Loader2, Search, Play
} from 'lucide-react';
import { fetchShows, fetchEvents, Show, Event } from '../lib/api';

interface EventCalendarProps {
    onNavigate: (page: string, id?: string | number) => void;
}

type ViewMode = 'month' | 'week' | 'day';
type ContentFilter = 'all' | 'shows' | 'events';

interface CalendarItem {
    id: number;
    title: string;
    type: 'show' | 'event';
    date: Date;
    endDate?: Date;
    thumbnail: string | null;
    creator: string;
    creatorId: number;
    slug?: string;
    isVirtual?: boolean;
    location?: string;
    status?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export const EventCalendar: React.FC<EventCalendarProps> = ({ onNavigate }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [filter, setFilter] = useState<ContentFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const [shows, setShows] = useState<Show[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [showsData, eventsData] = await Promise.all([
                    fetchShows('published'),
                    fetchEvents('published').catch(() => [])
                ]);
                setShows(showsData);
                setEvents(eventsData);
            } catch (error) {
                console.error('Failed to load calendar data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Helper: project recurring dates over 4 weeks
    const projectRecurringDates = (
        recurrenceType: string | null | undefined,
        dayOfWeek: number | null | undefined,
        scheduledTime: string | null | undefined
    ): Date[] => {
        const dates: Date[] = [];
        const now = new Date();
        for (let d = 0; d < 28; d++) {
            const date = new Date(now);
            date.setDate(date.getDate() + d);
            const dow = date.getDay(); // JS: 0=Sunday, 1=Monday, ... 6=Saturday
            let shouldAdd = false;
            if (recurrenceType === 'DAILY') shouldAdd = true;
            else if (recurrenceType === 'WEEKDAYS') shouldAdd = dow >= 1 && dow <= 5;
            else if (recurrenceType === 'WEEKENDS') shouldAdd = dow === 0 || dow === 6;
            else if (recurrenceType === 'SPECIFIC_DAY' && dayOfWeek !== undefined && dayOfWeek !== null) {
                // Backend: 0=Monday..6=Sunday → JS: 1=Monday..6=Saturday, 0=Sunday
                const frontendDay = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
                shouldAdd = dow === frontendDay;
            }
            if (shouldAdd) {
                if (scheduledTime) {
                    try {
                        // Handle both "HH:MM" time strings and full datetime strings
                        if (scheduledTime.includes(':') && scheduledTime.length <= 8) {
                            const [hours, minutes] = scheduledTime.split(':').map(Number);
                            date.setHours(hours, minutes, 0, 0);
                        } else {
                            const time = new Date(scheduledTime);
                            if (!isNaN(time.getTime())) date.setHours(time.getHours(), time.getMinutes(), 0, 0);
                        }
                    } catch { }
                }
                dates.push(new Date(date));
            }
        }
        return dates;
    };

    // Convert to calendar items
    const calendarItems: CalendarItem[] = useMemo(() => {
        const items: CalendarItem[] = [];

        if (filter === 'all' || filter === 'shows') {
            shows.forEach(show => {
                if (!show.is_recurring && show.scheduled_time) {
                    items.push({
                        id: show.id, title: show.title, type: 'show',
                        date: new Date(show.scheduled_time),
                        thumbnail: show.thumbnail, creator: show.creator.username,
                        creatorId: show.creator.id, slug: show.slug, status: show.status,
                    });
                }
                if (show.is_recurring && show.recurrence_type) {
                    projectRecurringDates(show.recurrence_type, show.day_of_week, show.scheduled_time)
                        .forEach(d => {
                            if (!items.find(i => i.id === show.id && i.type === 'show' && i.date.toDateString() === d.toDateString())) {
                                items.push({
                                    id: show.id, title: show.title, type: 'show', date: d,
                                    thumbnail: show.thumbnail, creator: show.creator.username,
                                    creatorId: show.creator.id, slug: show.slug, status: show.status,
                                });
                            }
                        });
                }
            });
        }

        if (filter === 'all' || filter === 'events') {
            events.forEach(event => {
                if (!event.is_recurring) {
                    const startDate = event.start_datetime || event.start_date;
                    const endDate = event.end_datetime || event.end_date;
                    if (startDate) {
                        items.push({
                            id: event.id, title: event.title, type: 'event',
                            date: new Date(startDate),
                            endDate: endDate ? new Date(endDate) : undefined,
                            thumbnail: event.banner_image || event.thumbnail,
                            creator: event.organizer.username, creatorId: event.organizer.id,
                            isVirtual: event.is_virtual,
                            location: event.venue_name || event.location || undefined,
                            status: event.status,
                        });
                    }
                }
                if (event.is_recurring && event.recurrence_type) {
                    projectRecurringDates(event.recurrence_type, event.day_of_week, event.scheduled_time || event.start_datetime || event.start_date)
                        .forEach(d => {
                            if (!items.find(i => i.id === event.id && i.type === 'event' && i.date.toDateString() === d.toDateString())) {
                                items.push({
                                    id: event.id, title: event.title, type: 'event', date: d,
                                    thumbnail: event.banner_image || event.thumbnail,
                                    creator: event.organizer.username, creatorId: event.organizer.id,
                                    isVirtual: event.is_virtual,
                                    location: event.venue_name || event.location || undefined,
                                    status: event.status,
                                });
                            }
                        });
                }
            });
        }

        if (searchQuery) {
            return items.filter(i =>
                i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.creator.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return items.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [shows, events, filter, searchQuery]);

    // Calendar grid helpers
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const navigate = (dir: number) => {
        const d = new Date(currentDate);
        if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
        else if (viewMode === 'week') d.setDate(d.getDate() + (dir * 7));
        else d.setDate(d.getDate() + dir);
        setCurrentDate(d);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    const getItemsForDate = (date: Date) => {
        return calendarItems.filter(item =>
            item.date.toDateString() === date.toDateString()
        );
    };

    const getWeekDates = () => {
        const d = new Date(currentDate);
        const day = d.getDay();
        const start = new Date(d);
        start.setDate(start.getDate() - day);
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return date;
        });
    };

    const selectedDateItems = selectedDate ? getItemsForDate(selectedDate) : [];
    const isToday = (d: Date) => d.toDateString() === new Date().toDateString();
    const isSelected = (d: Date) => selectedDate?.toDateString() === d.toDateString();

    const handleItemClick = (item: CalendarItem) => {
        if (item.type === 'show') {
            onNavigate('show-detail', item.slug || item.id);
        } else {
            onNavigate('event-detail', item.id);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen pt-24 pb-20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-24 pb-20">
            <div className="container max-w-[1200px] mx-auto px-6 space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-ink flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-gold" />
                            Calendar
                        </h1>
                        <p className="text-inkLight text-sm mt-1">Browse shows and events by date</p>
                    </div>

                    {/* Search */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search shows & events..."
                            className="w-full bg-surface border border-borderSubtle rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold transition-colors"
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-surface border border-borderSubtle rounded-2xl p-3 sm:p-4">
                    {/* Left: Navigation */}
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 sm:p-2 rounded-lg hover:bg-canvas transition-colors text-inkLight hover:text-ink flex-shrink-0"
                        >
                            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        <h2 className="text-base sm:text-lg font-bold text-ink flex-1 sm:min-w-[180px] text-center">
                            {viewMode === 'day'
                                ? currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                : viewMode === 'week'
                                    ? (() => {
                                        const dates = getWeekDates();
                                        return `${dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                                    })()
                                    : `${MONTHS[month]} ${year}`
                            }
                        </h2>

                        <button
                            onClick={() => navigate(1)}
                            className="p-1.5 sm:p-2 rounded-lg hover:bg-canvas transition-colors text-inkLight hover:text-ink flex-shrink-0"
                        >
                            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>

                        <button
                            onClick={goToToday}
                            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-gold/10 text-gold text-xs font-bold hover:bg-gold/20 transition-colors flex-shrink-0"
                        >
                            Today
                        </button>
                    </div>

                    {/* Right: View Mode + Filter */}
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* Content Filter */}
                        <div className="flex items-center gap-1 bg-canvas rounded-lg p-1 border border-borderSubtle flex-1 sm:flex-none">
                            {([
                                { id: 'all', label: 'All' },
                                { id: 'shows', label: 'Shows' },
                                { id: 'events', label: 'Events' },
                            ] as { id: ContentFilter; label: string }[]).map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${filter === f.id
                                        ? 'bg-gold text-white shadow-sm'
                                        : 'text-inkLight hover:text-ink'
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* View Toggle */}
                        <div className="flex items-center gap-1 bg-canvas rounded-lg p-1 border border-borderSubtle flex-1 sm:flex-none">
                            {([
                                { id: 'month', label: 'Month' },
                                { id: 'week', label: 'Week' },
                                { id: 'day', label: 'Day' },
                            ] as { id: ViewMode; label: string }[]).map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => setViewMode(v.id)}
                                    className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${viewMode === v.id
                                        ? 'bg-ink text-canvas shadow-sm'
                                        : 'text-inkLight hover:text-ink'
                                        }`}
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Calendar + Detail Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Calendar Grid */}
                    <div className="lg:col-span-2">
                        {viewMode === 'month' && (
                            <div className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden">
                                {/* Day Headers */}
                                <div className="grid grid-cols-7 border-b border-borderSubtle">
                                    {DAYS.map(day => (
                                        <div key={day} className="py-3 text-center text-xs font-bold text-inkLight uppercase tracking-wider">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Cells */}
                                <div className="grid grid-cols-7">
                                    {Array.from({ length: firstDay }, (_, i) => (
                                        <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-borderSubtle/50 bg-canvas/30" />
                                    ))}

                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const date = new Date(year, month, i + 1);
                                        const items = getItemsForDate(date);
                                        const today = isToday(date);
                                        const selected = isSelected(date);

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedDate(date)}
                                                className={`min-h-[100px] border-b border-r border-borderSubtle/50 p-1.5 cursor-pointer transition-colors hover:bg-gold/5 ${selected ? 'bg-gold/10 ring-1 ring-gold/30' : ''
                                                    }`}
                                            >
                                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${today
                                                    ? 'bg-gold text-white'
                                                    : selected
                                                        ? 'text-gold'
                                                        : 'text-ink'
                                                    }`}>
                                                    {i + 1}
                                                </span>

                                                {/* Event dots */}
                                                <div className="mt-1 space-y-0.5">
                                                    {items.slice(0, 3).map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded ${item.type === 'show'
                                                                ? 'bg-green-500/10 text-green-600'
                                                                : 'bg-blue-500/10 text-blue-600'
                                                                }`}
                                                        >
                                                            {item.title}
                                                        </div>
                                                    ))}
                                                    {items.length > 3 && (
                                                        <span className="text-[10px] text-inkLight font-semibold pl-1">
                                                            +{items.length - 3} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {viewMode === 'week' && (
                            <div className="bg-surface border border-borderSubtle rounded-2xl overflow-hidden">
                                <div className="grid grid-cols-7">
                                    {getWeekDates().map((date, i) => {
                                        const items = getItemsForDate(date);
                                        const today = isToday(date);
                                        const selected = isSelected(date);

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => setSelectedDate(date)}
                                                className={`min-h-[400px] border-r border-borderSubtle/50 p-2 cursor-pointer transition-colors hover:bg-gold/5 ${selected ? 'bg-gold/10' : ''
                                                    }`}
                                            >
                                                <div className="text-center mb-3">
                                                    <p className="text-xs font-bold text-inkLight uppercase">{DAYS[date.getDay()]}</p>
                                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${today ? 'bg-gold text-white' : 'text-ink'
                                                        }`}>
                                                        {date.getDate()}
                                                    </span>
                                                </div>

                                                <div className="space-y-1">
                                                    {items.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
                                                            className={`text-[11px] font-semibold p-1.5 rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${item.type === 'show'
                                                                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                                                : 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                                                                }`}
                                                        >
                                                            <p className="truncate">{item.title}</p>
                                                            <p className="text-[10px] opacity-70">{formatTime(item.date)}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {viewMode === 'day' && (
                            <div className="bg-surface border border-borderSubtle rounded-2xl p-6">
                                <div className="space-y-3">
                                    {(() => {
                                        const items = getItemsForDate(currentDate);
                                        if (items.length === 0) {
                                            return (
                                                <div className="text-center py-16">
                                                    <Calendar className="w-12 h-12 text-inkLight mx-auto mb-4" />
                                                    <p className="text-inkLight font-semibold">Nothing scheduled for this day</p>
                                                    <p className="text-xs text-inkLight mt-1">Try browsing other dates</p>
                                                </div>
                                            );
                                        }
                                        return items.map((item) => (
                                            <ItemCard key={`${item.type}-${item.id}`} item={item} onClick={() => handleItemClick(item)} />
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Detail Panel */}
                    <div className="lg:col-span-1">
                        <div className="bg-surface border border-borderSubtle rounded-2xl p-5 sticky top-24">
                            <h3 className="text-lg font-bold text-ink mb-1">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                                    : 'Select a Date'
                                }
                            </h3>
                            {selectedDate && isToday(selectedDate) && (
                                <span className="text-xs font-bold text-gold">Today</span>
                            )}

                            <div className="mt-4 space-y-3">
                                {selectedDateItems.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Calendar className="w-10 h-10 text-inkLight/50 mx-auto mb-3" />
                                        <p className="text-sm text-inkLight">Nothing scheduled</p>
                                    </div>
                                ) : (
                                    selectedDateItems.map((item) => (
                                        <ItemCard key={`${item.type}-${item.id}`} item={item} onClick={() => handleItemClick(item)} />
                                    ))
                                )}
                            </div>

                            {/* Legend */}
                            <div className="mt-6 pt-4 border-t border-borderSubtle">
                                <p className="text-xs font-bold text-inkLight uppercase tracking-wider mb-2">Legend</p>
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/50" />
                                        <span className="text-xs text-inkLight">Shows</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50" />
                                        <span className="text-xs text-inkLight">Events</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Item Card sub-component
const ItemCard: React.FC<{ item: CalendarItem; onClick: () => void }> = ({ item, onClick }) => {
    const formatTime = (date: Date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:scale-[1.01] border ${item.type === 'show'
                ? 'bg-green-500/5 border-green-500/20 hover:border-green-500/40'
                : 'bg-blue-500/5 border-blue-500/20 hover:border-blue-500/40'
                }`}
        >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-canvas flex-shrink-0">
                {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center ${item.type === 'show' ? 'text-green-500' : 'text-blue-500'
                        }`}>
                        {item.type === 'show' ? <Play className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${item.type === 'show'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-blue-500/10 text-blue-600'
                        }`}>
                        {item.type}
                    </span>
                </div>
                <p className="text-sm font-bold text-ink truncate">{item.title}</p>
                <div className="flex items-center gap-2 text-xs text-inkLight">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(item.date)}</span>
                    <span>·</span>
                    <span>{item.creator}</span>
                </div>
                {item.type === 'event' && (
                    <div className="flex items-center gap-1 text-[10px] text-inkLight mt-0.5">
                        {item.isVirtual ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        <span>{item.isVirtual ? 'Virtual' : item.location || 'TBD'}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
