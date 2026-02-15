import React, { useEffect } from 'react';
import {
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    addDays,
    format,
    isSameMonth,
    isSameDay,
    isToday,
    parseISO
} from 'date-fns';
import { Show, Event } from '../lib/api';
import { Video, Calendar as CalendarIcon } from 'lucide-react';

interface RealTimeCalendarProps {
    shows: Show[];
    events: Event[];
    currentDate: Date;
    onDateClick?: (date: Date) => void;
    onShowClick?: (show: Show) => void;
}

export const RealTimeCalendar: React.FC<RealTimeCalendarProps> = ({
    shows,
    events,
    currentDate,
    onDateClick,
    onShowClick
}) => {


    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const rows: Date[][] = [];
    let days: Date[] = [];
    let day = startDate;

    // Build calendar grid
    while (day <= endDate) {
        for (let i = 0; i < 7; i++) {
            days.push(day);
            day = addDays(day, 1);
        }
        rows.push(days);
        days = [];
    }

    // Find events for a specific day
    const getEventsForDay = (date: Date) => {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

        const dayShows = shows.filter(show => {
            if (!show.is_recurring) {
                // For non-recurring shows, check if they have a scheduled_time (datetime)
                if (!show.scheduled_time) return false;
                try {
                    const showDate = parseISO(show.scheduled_time);
                    return isSameDay(showDate, date);
                } catch (error) {
                    return false;
                }
            } else {
                // For recurring shows, check the recurrence pattern
                switch (show.recurrence_type) {
                    case 'DAILY':
                        // Show every day
                        return true;

                    case 'WEEKDAYS':
                        // Monday (1) to Friday (5)
                        return dayOfWeek >= 1 && dayOfWeek <= 5;

                    case 'WEEKENDS':
                        // Saturday (6) and Sunday (0)
                        return dayOfWeek === 0 || dayOfWeek === 6;

                    case 'SPECIFIC_DAY':
                        // Show on specific day of week
                        // Backend uses 0=Monday, frontend getDay uses 0=Sunday
                        // Convert: backend 0-6 (Mon-Sun) to frontend 1-6,0 (Mon-Sun)
                        if (show.day_of_week === null) return false;
                        const frontendDay = show.day_of_week === 6 ? 0 : show.day_of_week + 1;
                        return dayOfWeek === frontendDay;

                    default:
                        return false;
                }
            }
        });

        const dayEvents = events.filter(event => {
            if (!event.is_recurring) {
                // For non-recurring events, check start_datetime
                const startDt = event.start_datetime || event.start_date;
                if (!startDt) return false;
                try {
                    const eventDate = parseISO(startDt);
                    return isSameDay(eventDate, date);
                } catch (error) {
                    return false;
                }
            } else {
                // For recurring events, check the recurrence pattern
                switch (event.recurrence_type) {
                    case 'DAILY':
                        return true;

                    case 'WEEKDAYS':
                        return dayOfWeek >= 1 && dayOfWeek <= 5;

                    case 'WEEKENDS':
                        return dayOfWeek === 0 || dayOfWeek === 6;

                    case 'SPECIFIC_DAY':
                        if (event.day_of_week === null) return false;
                        const frontendDay = event.day_of_week === 6 ? 0 : event.day_of_week + 1;
                        return dayOfWeek === frontendDay;

                    default:
                        return false;
                }
            }
        });

        return { shows: dayShows, events: dayEvents };
    };

    return (
        <div className="w-full">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-2">
                {weekDays.map(day => (
                    <div key={day} className="text-center text-xs font-bold text-inkLight uppercase tracking-wider py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="space-y-2">
                {rows.map((week, weekIdx) => (
                    <div key={weekIdx} className="grid grid-cols-7 gap-2">
                        {week.map((day, dayIdx) => {
                            const { shows: dayShows, events: dayEvents } = getEventsForDay(day);
                            const isCurrentMonth = isSameMonth(day, currentDate);
                            const isDayToday = isToday(day);
                            const hasContent = dayShows.length > 0 || dayEvents.length > 0;

                            return (
                                <div
                                    key={dayIdx}
                                    onClick={() => onDateClick && onDateClick(day)}
                                    className={`relative min-h-[80px] md:min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer
                    ${!isCurrentMonth ? 'bg-transparent border-transparent opacity-30' : 'bg-surface border-borderSubtle'}
                    ${isDayToday ? 'ring-2 ring-gold border-gold' : ''}
                    ${hasContent ? 'hover:border-gold/50' : 'hover:border-gold/30'}
                  `}
                                >
                                    {/* Day number */}
                                    <div className={`text-xs font-bold mb-1 ${isDayToday ? 'text-gold' :
                                        isCurrentMonth ? 'text-ink' : 'text-inkLight/50'
                                        }`}>
                                        {format(day, 'd')}
                                    </div>

                                    {/* Shows for this day */}
                                    <div className="space-y-1">
                                        {dayShows.slice(0, 2).map(show => (
                                            <div
                                                key={`show-${show.id}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onShowClick?.(show);
                                                }}
                                                className={`text-[9px] md:text-[10px] font-bold px-1.5 py-1 rounded border truncate cursor-pointer transition-all ${show.status === 'published'
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                                                    : show.status === 'draft'
                                                        ? 'bg-surface text-inkLight border-borderSubtle hover:bg-surface/80'
                                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                                    }`}
                                                title={show.title}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <Video className="w-2 h-2 shrink-0" />
                                                    <span className="truncate">{show.title}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Events for this day */}
                                        {dayEvents.slice(0, 2 - dayShows.length).map(event => (
                                            <div
                                                key={`event-${event.id}`}
                                                className="text-[9px] md:text-[10px] font-bold px-1.5 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 truncate"
                                                title={event.title}
                                            >
                                                <div className="flex items-center gap-1">
                                                    <CalendarIcon className="w-2 h-2 shrink-0" />
                                                    <span className="truncate">{event.title}</span>
                                                </div>
                                            </div>
                                        ))}

                                        {/* More indicator */}
                                        {(dayShows.length + dayEvents.length) > 2 && (
                                            <div className="text-[8px] text-inkLight font-bold px-1">
                                                +{dayShows.length + dayEvents.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px]">
                <span className="font-bold text-inkLight">Legend:</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/40"></div>
                    <span className="text-inkLight">Published</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-surface border border-borderSubtle"></div>
                    <span className="text-inkLight">Draft</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/40"></div>
                    <span className="text-inkLight">Event</span>
                </div>
            </div>
        </div>
    );
};


