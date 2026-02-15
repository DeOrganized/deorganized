import React, { useState, useEffect } from 'react';
import {
   User, Settings, DollarSign, TrendingUp, Calendar as CalendarIcon,
   Plus, Users, Bell, Check, X, Clock, Video,
   BarChart3, ArrowUpRight, MoreHorizontal, Heart, MessageSquare,
   Trophy, Loader2, ChevronLeft, ChevronRight, Repeat, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { addMonths, subMonths, format } from 'date-fns';
import { useAuth } from '../lib/AuthContext';
import {
   fetchCreatorShows,
   fetchCreatorEvents,
   fetchUserProfile,
   updateUserProfile,
   createShow,
   fetchNotifications,
   markNotificationRead,
   markAllNotificationsRead,
   fetchShowByPk,
   getReceivedGuestRequests,
   acceptGuestRequest,
   declineGuestRequest,
   CreateShowPayload,
   Show,
   Event,
   CreatorStats,
   UserProfile,
   Notification,
   GuestRequest,
   Tag
} from '../lib/api';
import { RealTimeCalendar } from './RealTimeCalendar';
import { EditShowModal } from './EditShowModal';
import { EditEventModal } from './EditEventModal';
import { TagInput } from './TagInput';

interface CreatorDashboardProps {
   onNavigate: (page: string) => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({ onNavigate }) => {
   const { backendUser, accessToken, logout } = useAuth();
   const [showSuccessToast, setShowSuccessToast] = useState(false);
   const [toastMessage, setToastMessage] = useState('');
   const [toastType, setToastType] = useState<'success' | 'error'>('success');

   // Data states
   const [profile, setProfile] = useState<UserProfile | null>(null);
   const [shows, setShows] = useState<Show[]>([]);
   const [events, setEvents] = useState<Event[]>([]);
   const [stats, setStats] = useState<CreatorStats | null>(null);
   const [notifications, setNotifications] = useState<Notification[]>([]);
   const [guestRequests, setGuestRequests] = useState<GuestRequest[]>([]);

   // Loading states
   const [isLoadingProfile, setIsLoadingProfile] = useState(true);
   const [isLoadingShows, setIsLoadingShows] = useState(true);
   const [isLoadingEvents, setIsLoadingEvents] = useState(true);
   const [isLoadingStats, setIsLoadingStats] = useState(true);
   const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);

   // Calendar state
   const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

   // Form state
   const [formData, setFormData] = useState({
      title: '',
      description: '',
      thumbnail: null as File | null,
      is_recurring: false,
      recurrence_type: undefined as 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | undefined,
      day_of_week: undefined as number | undefined,
      scheduled_time: '',
      status: 'draft' as 'draft' | 'published',
      tags: [] as Tag[],
      external_link: '',
      link_platform: '' as 'youtube' | 'twitter' | 'twitch' | 'rumble' | 'kick' | 'other' | ''
   });
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [formError, setFormError] = useState<string | null>(null);
   const [formSuccess, setFormSuccess] = useState(false);

   // Edit show state
   const [showToEdit, setShowToEdit] = useState<Show | null>(null);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);

   // Edit event state
   const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
   const [isEditEventModalOpen, setIsEditEventModalOpen] = useState(false);

   // Create mode toggle (show vs event)
   const [createMode, setCreateMode] = useState<'show' | 'event'>('show');

   // Event form state
   const [eventFormData, setEventFormData] = useState({
      title: '',
      description: '',
      start_datetime: '',
      end_datetime: '',
      venue_name: '',
      address: '',
      is_virtual: false,
      meeting_link: '',
      is_public: true,
      banner_image: null as File | null,
      is_recurring: false,
      recurrence_type: undefined as 'SPECIFIC_DAY' | 'DAILY' | 'WEEKDAYS' | 'WEEKENDS' | undefined,
      day_of_week: undefined as number | undefined,
      scheduled_time: '',
   });
   const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);

   // Fetch creator profile
   useEffect(() => {
      const loadProfile = async () => {
         if (!backendUser?.id || !accessToken) return;

         try {
            setIsLoadingProfile(true);
            const profileData = await fetchUserProfile(backendUser.id, accessToken);
            setProfile(profileData);
         } catch (error) {
            console.error('Failed to load profile:', error);
         } finally {
            setIsLoadingProfile(false);
         }
      };

      loadProfile();
   }, [backendUser?.id, accessToken]);

   // Fetch creator's shows
   useEffect(() => {
      const loadShows = async () => {
         if (!backendUser?.id || !accessToken) return;

         try {
            setIsLoadingShows(true);
            const showsData = await fetchCreatorShows(backendUser.id, accessToken);
            setShows(showsData);
         } catch (error) {
            console.error('Failed to load shows:', error);
         } finally {
            setIsLoadingShows(false);
         }
      };

      loadShows();
   }, [backendUser?.id, accessToken]);

   // Fetch creator's events
   useEffect(() => {
      const loadEvents = async () => {
         if (!backendUser?.id || !accessToken) return;

         try {
            setIsLoadingEvents(true);
            const eventsData = await fetchCreatorEvents(backendUser.id, accessToken);
            setEvents(eventsData);
         } catch (error) {
            console.error('Failed to load events:', error);
         } finally {
            setIsLoadingEvents(false);
         }
      };

      loadEvents();
   }, [backendUser?.id, accessToken]);

   // Fetch guest requests
   useEffect(() => {
      const loadGuestRequests = async () => {
         if (!accessToken) return;

         try {
            const requests = await getReceivedGuestRequests(accessToken);
            setGuestRequests(requests.filter(r => r.status === 'pending'));
         } catch (error) {
            console.error('Failed to load guest requests:', error);
         }
      };

      loadGuestRequests();
   }, [accessToken]);


   // Calculate creator stats from shows and events data
   useEffect(() => {
      if (!shows.length && !events.length && !profile) {
         return;
      }

      try {
         setIsLoadingStats(true);

         // Calculate stats from existing data
         const totalLikes = shows.reduce((sum, show) => sum + (show.like_count || 0), 0);
         const totalComments = shows.reduce((sum, show) => sum + (show.comment_count || 0), 0);
         const totalShares = shows.reduce((sum, show) => sum + (show.share_count || 0), 0);

         const statsData: CreatorStats = {
            total_views: 0, // We don't track views yet
            total_shares: totalShares,
            total_likes: totalLikes,
            total_comments: totalComments,
            follower_count: profile?.follower_count || 0,
            following_count: profile?.following_count || 0,
            show_count: shows.length,
            event_count: events.length,
         };

         setStats(statsData);
      } catch (error) {
         console.error('Failed to calculate stats:', error);
      } finally {
         setIsLoadingStats(false);
      }
   }, [shows, events, profile]);

   // Fetch notifications
   useEffect(() => {
      const loadNotifications = async () => {
         if (!accessToken) return;

         try {
            setIsLoadingNotifications(true);
            const notificationsData = await fetchNotifications(accessToken);
            // Ensure we always have an array
            setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
         } catch (error) {
            console.error('Failed to load notifications:', error);
            setNotifications([]); // Set empty array on error
         } finally {
            setIsLoadingNotifications(false);
         }
      };

      loadNotifications();
   }, [accessToken]);

   // Form handlers
   const handleFormChange = (field: string, value: any) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      setFormError(null);
   };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         setFormData(prev => ({ ...prev, thumbnail: e.target.files![0] }));
      }
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      // Validation
      if (!formData.title.trim() || formData.title.length < 3) {
         setFormError('Title must be at least 3 characters');
         return;
      }

      if (!formData.description.trim() || formData.description.length < 10) {
         setFormError('Description must be at least 10 characters');
         return;
      }

      if (formData.is_recurring) {
         if (!formData.recurrence_type) {
            setFormError('Please select a recurrence pattern');
            return;
         }
         if (formData.recurrence_type === 'SPECIFIC_DAY' && formData.day_of_week === undefined) {
            setFormError('Please select a day of the week for specific day recurrence');
            return;
         }
         if (!formData.scheduled_time) {
            setFormError('Please select a time for recurring shows');
            return;
         }
      }

      if (!accessToken) {
         setFormError('You must be logged in to create a show');
         return;
      }

      try {
         setIsSubmitting(true);
         setFormError(null);

         const payload: CreateShowPayload = {
            title: formData.title,
            description: formData.description,
            is_recurring: formData.is_recurring,
            status: formData.status,
         };

         if (formData.thumbnail) {
            payload.thumbnail = formData.thumbnail;
         }

         if (formData.tags.length > 0) {
            payload.tag_ids = formData.tags.map(t => t.id);
         }

         if (formData.external_link) {
            payload.external_link = formData.external_link;
            payload.link_platform = formData.link_platform || undefined;
         }

         if (formData.is_recurring) {
            payload.recurrence_type = formData.recurrence_type;
            if (formData.recurrence_type === 'SPECIFIC_DAY') {
               payload.day_of_week = formData.day_of_week;
            }
            payload.scheduled_time = formData.scheduled_time;
         }

         await createShow(payload, accessToken);

         setFormSuccess(true);
         setFormData({
            title: '',
            description: '',
            thumbnail: null,
            is_recurring: false,
            recurrence_type: undefined,
            day_of_week: undefined,
            scheduled_time: '',
            status: 'draft',
            tags: [],
            external_link: '',
            link_platform: ''
         });

         // Refresh shows list
         if (backendUser?.id) {
            const showsData = await fetchCreatorShows(backendUser.id, accessToken);
            setShows(showsData);
         }

         // Hide success message after 3 seconds
         setTimeout(() => setFormSuccess(false), 3000);

      } catch (error: any) {
         setFormError(error.message || 'Failed to create show. Please try again.');
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleEditShow = (show: Show) => {
      setShowToEdit(show);
      setIsEditModalOpen(true);
   };

   const handleEditSuccess = async () => {
      // Refresh shows list
      if (backendUser?.id && accessToken) {
         try {
            const updated = await fetchCreatorShows(backendUser.id, accessToken);
            setShows(updated);
         } catch (error) {
            console.error('Failed to refresh shows:', error);
         }
      }
   };

   const handleEditEvent = (event: Event) => {
      setEventToEdit(event);
      setIsEditEventModalOpen(true);
   };

   const handleEditEventSuccess = async () => {
      // Refresh events list
      if (backendUser?.id && accessToken) {
         try {
            const updated = await fetchCreatorEvents(backendUser.id, accessToken);
            setEvents(updated);
         } catch (error) {
            console.error('Failed to refresh events:', error);
         }
      }
   };

   if (!backendUser || backendUser.role !== 'creator') {
      return (
         <div className="min-h-screen pt-24 pb-20 container max-w-[1024px] mx-auto px-6 flex items-center justify-center">
            <p className="text-inkLight">Creator access only. Please log in with a creator account.</p>
         </div>
      );
   }

   const formatNumber = (num: number): string => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
      return num.toString();
   };



   return (
      <div className="min-h-screen pt-24 pb-20 container max-w-[1024px] mx-auto px-6 space-y-8">

         {/* Header */}
         <div className="flex justify-between items-end">
            <div>
               <h1 className="text-4xl font-bold text-ink mb-2">Creator Studio</h1>
               <p className="text-inkLight font-medium">Manage your content, earnings, and community.</p>
            </div>
            <button
               onClick={logout}
               className="hidden md:flex items-center gap-2 text-sm font-bold text-ink hover:text-red-500 transition-colors"
            >
               <Settings className="w-4 h-4" /> Sign Out
            </button>
         </div>

         {/* 1. Profile Overview Card */}
         <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 md:p-8 shadow-soft relative overflow-hidden">
            {isLoadingProfile ? (
               <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-gold animate-spin" />
               </div>
            ) : (
               <>
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
                     <div className="relative">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-surface shadow-md overflow-hidden bg-surface">
                           {profile?.profile_picture ? (
                              <img src={profile.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                 <User className="w-16 h-16 text-gold" />
                              </div>
                           )}
                        </div>
                        {profile?.is_verified && (
                           <div className="absolute bottom-1 right-1 bg-gold text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                              <Check className="w-4 h-4" />
                           </div>
                        )}
                     </div>

                     <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-bold text-ink flex items-center justify-center md:justify-start gap-2 mb-1">
                           {profile?.username || backendUser.username}
                           {profile?.is_verified && (
                              <span className="bg-gold/10 text-gold text-xs px-2 py-0.5 rounded-full border border-gold/20 uppercase tracking-wider">Verified</span>
                           )}
                        </h2>
                        <p className="text-inkLight font-medium mb-6">
                           @{profile?.username || backendUser.username} • {profile?.bio || 'Creator'}
                        </p>

                        <div className="grid grid-cols-3 gap-4 md:gap-12 border-t border-borderSubtle pt-6">
                           <div>
                              <div className="text-2xl font-bold text-ink">
                                 {formatNumber(profile?.follower_count || 0)}
                              </div>
                              <div className="text-xs text-inkLight font-bold uppercase tracking-wide">Followers</div>
                           </div>
                           <div>
                              <div className="text-2xl font-bold text-ink">
                                 {formatNumber(stats?.total_shares || 0)}
                              </div>
                              <div className="text-xs text-inkLight font-bold uppercase tracking-wide">Total Shares</div>
                           </div>
                           <div>
                              <div className="text-2xl font-bold text-ink">
                                 {stats?.show_count || shows.length}
                              </div>
                              <div className="text-xs text-inkLight font-bold uppercase tracking-wide">Shows</div>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col gap-3 min-w-[160px]">
                        <button
                           onClick={() => onNavigate('edit-profile')}
                           className="bg-transparent border border-borderSubtle text-ink font-bold py-2.5 rounded-xl hover:border-gold hover:text-gold transition-colors shadow-sm"
                        >
                           Edit Profile
                        </button>
                        <button className="bg-canvas border border-borderSubtle text-ink font-bold py-2.5 rounded-xl hover:bg-surface transition-colors">
                           View Channel
                        </button>
                     </div>
                  </div>

                  {/* Background Decor */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
               </>
            )}
         </section>

         {/* 2. Video Metrics Cards */}
         <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard
               icon={Heart}
               label="Total Likes"
               value={formatNumber(stats?.total_likes || 0)}
               color="text-red-500 bg-red-50"
               isLoading={isLoadingStats}
            />
            <StatsCard
               icon={MessageSquare}
               label="Total Comments"
               value={formatNumber(stats?.total_comments || 0)}
               color="text-blue-500 bg-blue-50"
               isLoading={isLoadingStats}
            />
            <StatsCard
               icon={BarChart3}
               label="Total Views"
               value={formatNumber(stats?.total_views || 0)}
               color="text-green-500 bg-green-50"
               isLoading={isLoadingStats}
            />
         </section>

         {/* 3. Show Scheduler & Calendar */}
         <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Show Form */}
            <div className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft h-fit">
               {/* Toggle: Show vs Event */}
               <div className="flex items-center gap-2 mb-4">
                  <button
                     onClick={() => { setCreateMode('show'); setFormError(null); setFormSuccess(false); }}
                     className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${createMode === 'show' ? 'bg-gold text-white shadow' : 'bg-surface text-inkLight hover:text-ink'}`}
                  >
                     Show
                  </button>
                  <button
                     onClick={() => { setCreateMode('event'); setFormError(null); setFormSuccess(false); }}
                     className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${createMode === 'event' ? 'bg-gold text-white shadow' : 'bg-surface text-inkLight hover:text-ink'}`}
                  >
                     Event
                  </button>
               </div>

               <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-gold/10 rounded-lg text-gold">
                     <CalendarIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-ink">{createMode === 'show' ? 'Create Show' : 'Create Event'}</h3>
               </div>

               {/* Success Message */}
               {formSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium flex items-center gap-2">
                     <Check className="w-4 h-4" />
                     {createMode === 'show' ? 'Show' : 'Event'} created successfully!
                  </div>
               )}

               {/* Error Message */}
               {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-center gap-2">
                     <X className="w-4 h-4" />
                     {formError}
                  </div>
               )}

               {createMode === 'show' && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Show Title *</label>
                        <input
                           type="text"
                           placeholder="e.g. DeFi Deep Dive"
                           value={formData.title}
                           onChange={(e) => handleFormChange('title', e.target.value)}
                           className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors"
                        />
                     </div>

                     {/* Description */}
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Description *</label>
                        <textarea
                           placeholder="Describe your show..."
                           value={formData.description}
                           onChange={(e) => handleFormChange('description', e.target.value)}
                           rows={3}
                           className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors resize-none"
                        />
                     </div>

                     {/* Thumbnail Upload */}
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Thumbnail (Optional)</label>
                        <input
                           type="file"
                           accept="image/*"
                           onChange={handleFileChange}
                           className="w-full text-sm text-inkLight file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold file:text-white hover:file:bg-gold/90 cursor-pointer"
                        />
                        {formData.thumbnail && (
                           <p className="text-xs text-green-600 mt-2">Selected: {formData.thumbnail.name}</p>
                        )}
                     </div>

                     {/* Tags */}
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Tags</label>
                        <TagInput
                           selectedTags={formData.tags}
                           onChange={(tags) => setFormData({ ...formData, tags })}
                           placeholder="Add tags (Bitcoin, Stacks, etc.)"
                        />
                     </div>

                     {/* External Link (Watch Now) */}
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">
                           Watch Now Link <span className="text-inkLight/50 normal-case">(Optional)</span>
                        </label>
                        <div className="space-y-3">
                           <select
                              value={formData.link_platform}
                              onChange={(e) => setFormData({ ...formData, link_platform: e.target.value as any })}
                              className="w-full bg-canvas border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors"
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
                              className="w-full bg-canvas border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors"
                           />
                        </div>
                     </div>

                     {/* Recurring Toggle */}
                     <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input
                              type="checkbox"
                              checked={formData.is_recurring}
                              onChange={(e) => handleFormChange('is_recurring', e.target.checked)}
                              className="w-4 h-4 text-gold border-gray-300 rounded focus:ring-gold"
                           />
                           <span className="text-sm font-bold text-ink flex items-center gap-1">
                              <Repeat className="w-3 h-3" /> Recurring Show
                           </span>
                        </label>
                     </div>

                     {/* Recurring Options - Only show if recurring is checked */}
                     {formData.is_recurring && (
                        <div className="space-y-4 p-4 bg-surface/50 rounded-xl border border-borderSubtle">
                           {/* Recurrence Pattern */}
                           <div>
                              <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Recurrence Pattern *</label>
                              <div className="grid grid-cols-2 gap-2">
                                 <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, recurrence_type: 'DAILY', day_of_week: undefined })}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'DAILY'
                                       ? 'bg-gold text-white'
                                       : 'bg-canvas border border-borderSubtle text-inkLight hover:border-gold'
                                       }`}
                                 >
                                    Daily
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, recurrence_type: 'WEEKDAYS', day_of_week: undefined })}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'WEEKDAYS'
                                       ? 'bg-gold text-white'
                                       : 'bg-canvas border border-borderSubtle text-inkLight hover:border-gold'
                                       }`}
                                 >
                                    Weekdays
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, recurrence_type: 'WEEKENDS', day_of_week: undefined })}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'WEEKENDS'
                                       ? 'bg-gold text-white'
                                       : 'bg-canvas border border-borderSubtle text-inkLight hover:border-gold'
                                       }`}
                                 >
                                    Weekends
                                 </button>
                                 <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, recurrence_type: 'SPECIFIC_DAY' })}
                                    className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${formData.recurrence_type === 'SPECIFIC_DAY'
                                       ? 'bg-gold text-white'
                                       : 'bg-canvas border border-borderSubtle text-inkLight hover:border-gold'
                                       }`}
                                 >
                                    Specific Day
                                 </button>
                              </div>
                           </div>

                           {/* Day of Week - Only for Specific Day */}
                           {formData.recurrence_type === 'SPECIFIC_DAY' && (
                              <div>
                                 <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Day of Week *</label>
                                 <div className="relative">
                                    <select
                                       value={formData.day_of_week ?? ''}
                                       onChange={(e) => handleFormChange('day_of_week', parseInt(e.target.value))}
                                       className="w-full appearance-none bg-canvas border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors text-ink cursor-pointer"
                                    >
                                       <option value="">Select day</option>
                                       <option value="0">Monday</option>
                                       <option value="1">Tuesday</option>
                                       <option value="2">Wednesday</option>
                                       <option value="3">Thursday</option>
                                       <option value="4">Friday</option>
                                       <option value="5">Saturday</option>
                                       <option value="6">Sunday</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-inkLight pointer-events-none" />
                                 </div>
                              </div>
                           )}

                           {/* Time */}
                           <div>
                              <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Time *</label>
                              <input
                                 type="time"
                                 value={formData.scheduled_time}
                                 onChange={(e) => handleFormChange('scheduled_time', e.target.value)}
                                 className="w-full bg-canvas border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors"
                              />
                           </div>
                        </div>
                     )}

                     {/* Status Toggle */}
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Status</label>
                        <div className="flex gap-2">
                           <button
                              type="button"
                              onClick={() => handleFormChange('status', 'draft')}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${formData.status === 'draft'
                                 ? 'bg-transparent border border-ink text-ink'
                                 : 'bg-surface text-inkLight hover:bg-surface'
                                 }`}
                           >
                              Draft
                           </button>
                           <button
                              type="button"
                              onClick={() => handleFormChange('status', 'published')}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${formData.status === 'published'
                                 ? 'bg-gold text-white'
                                 : 'bg-surface text-inkLight hover:bg-surface'
                                 }`}
                           >
                              Published
                           </button>
                        </div>
                     </div>

                     {/* Submit Button */}
                     <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-gold-gradient text-white font-bold py-3.5 rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                     >
                        {isSubmitting ? (
                           <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating...
                           </>
                        ) : (
                           <>
                              <Plus className="w-4 h-4" />
                              Create Show
                           </>
                        )}
                     </button>
                  </form>
               )}

               {/* Event Form (hidden when createMode is 'show') */}
               {createMode === 'event' && (
                  <form onSubmit={async (e) => {
                     e.preventDefault();
                     if (!accessToken) { setFormError('You must be logged in'); return; }
                     if (!eventFormData.title.trim()) { setFormError('Title is required'); return; }
                     // Validate based on event type
                     if (eventFormData.is_recurring) {
                        if (!eventFormData.recurrence_type) { setFormError('Recurrence pattern is required'); return; }
                        if (!eventFormData.scheduled_time) { setFormError('Scheduled time is required for recurring events'); return; }
                        if (eventFormData.recurrence_type === 'SPECIFIC_DAY' && eventFormData.day_of_week === undefined) { setFormError('Day of week is required'); return; }
                     } else {
                        if (!eventFormData.start_datetime) { setFormError('Start date/time is required'); return; }
                     }
                     try {
                        setIsSubmittingEvent(true);
                        setFormError(null);
                        const { createEvent } = await import('../lib/api');
                        await createEvent({
                           title: eventFormData.title,
                           description: eventFormData.description,
                           start_datetime: eventFormData.start_datetime || undefined,
                           end_datetime: eventFormData.end_datetime || undefined,
                           venue_name: eventFormData.venue_name,
                           address: eventFormData.address,
                           is_virtual: eventFormData.is_virtual,
                           meeting_link: eventFormData.meeting_link || undefined,
                           is_public: eventFormData.is_public,
                           banner_image: eventFormData.banner_image || undefined,
                           is_recurring: eventFormData.is_recurring,
                           recurrence_type: eventFormData.is_recurring ? eventFormData.recurrence_type : undefined,
                           day_of_week: eventFormData.is_recurring && eventFormData.recurrence_type === 'SPECIFIC_DAY' ? eventFormData.day_of_week : undefined,
                           scheduled_time: eventFormData.is_recurring ? eventFormData.scheduled_time || undefined : undefined,
                        }, accessToken);
                        setFormSuccess(true);
                        setEventFormData({ title: '', description: '', start_datetime: '', end_datetime: '', venue_name: '', address: '', is_virtual: false, meeting_link: '', is_public: true, banner_image: null, is_recurring: false, recurrence_type: undefined, day_of_week: undefined, scheduled_time: '' });
                        setTimeout(() => setFormSuccess(false), 3000);
                     } catch (err: any) {
                        setFormError(err.message || 'Failed to create event');
                     } finally {
                        setIsSubmittingEvent(false);
                     }
                  }} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Event Title *</label>
                        <input type="text" placeholder="e.g. Bitcoin Meetup" value={eventFormData.title}
                           onChange={(e) => setEventFormData(prev => ({ ...prev, title: e.target.value }))}
                           className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Description</label>
                        <textarea placeholder="Describe your event..." value={eventFormData.description}
                           onChange={(e) => setEventFormData(prev => ({ ...prev, description: e.target.value }))}
                           rows={3} className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors resize-none" />
                     </div>
                     {/* Only show date pickers for one-off events */}
                     {!eventFormData.is_recurring && (
                        <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Start *</label>
                              <input type="datetime-local" value={eventFormData.start_datetime}
                                 onChange={(e) => setEventFormData(prev => ({ ...prev, start_datetime: e.target.value }))}
                                 className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors" />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">End</label>
                              <input type="datetime-local" value={eventFormData.end_datetime}
                                 onChange={(e) => setEventFormData(prev => ({ ...prev, end_datetime: e.target.value }))}
                                 className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors" />
                           </div>
                        </div>
                     )}
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Venue Name</label>
                        <input type="text" placeholder="e.g. Community Center" value={eventFormData.venue_name}
                           onChange={(e) => setEventFormData(prev => ({ ...prev, venue_name: e.target.value }))}
                           className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Address</label>
                        <input type="text" placeholder="123 Main St" value={eventFormData.address}
                           onChange={(e) => setEventFormData(prev => ({ ...prev, address: e.target.value }))}
                           className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors" />
                     </div>
                     <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked={eventFormData.is_virtual}
                              onChange={(e) => setEventFormData(prev => ({ ...prev, is_virtual: e.target.checked }))}
                              className="w-4 h-4 text-gold border-gray-300 rounded focus:ring-gold" />
                           <span className="text-sm font-bold text-ink">Virtual Event</span>
                        </label>
                     </div>

                     {/* Recurring Toggle */}
                     <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked={eventFormData.is_recurring}
                              onChange={(e) => setEventFormData(prev => ({ ...prev, is_recurring: e.target.checked, recurrence_type: undefined, day_of_week: undefined, scheduled_time: '' }))}
                              className="w-4 h-4 text-gold border-gray-300 rounded focus:ring-gold" />
                           <span className="text-sm font-bold text-ink flex items-center gap-1">
                              <Repeat className="w-3 h-3" /> Recurring Event
                           </span>
                        </label>
                     </div>

                     {/* Recurring Options */}
                     {eventFormData.is_recurring && (
                        <div className="space-y-4 p-4 bg-surface/50 rounded-xl border border-borderSubtle">
                           <div>
                              <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Recurrence Pattern *</label>
                              <div className="grid grid-cols-2 gap-2">
                                 {(['DAILY', 'WEEKDAYS', 'WEEKENDS', 'SPECIFIC_DAY'] as const).map(type => (
                                    <button key={type} type="button"
                                       onClick={() => setEventFormData(prev => ({ ...prev, recurrence_type: type, day_of_week: type !== 'SPECIFIC_DAY' ? undefined : prev.day_of_week }))}
                                       className={`py-2 px-3 rounded-lg text-sm font-bold transition-colors ${eventFormData.recurrence_type === type ? 'bg-gold text-white' : 'bg-canvas border border-borderSubtle text-inkLight hover:border-gold'}`}>
                                       {type === 'SPECIFIC_DAY' ? 'Specific Day' : type.charAt(0) + type.slice(1).toLowerCase()}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           {eventFormData.recurrence_type === 'SPECIFIC_DAY' && (
                              <div>
                                 <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Day of Week *</label>
                                 <select value={eventFormData.day_of_week ?? ''}
                                    onChange={(e) => setEventFormData(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                                    className="w-full bg-canvas border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors">
                                    <option value="">Select day</option>
                                    <option value="0">Sunday</option>
                                    <option value="1">Monday</option>
                                    <option value="2">Tuesday</option>
                                    <option value="3">Wednesday</option>
                                    <option value="4">Thursday</option>
                                    <option value="5">Friday</option>
                                    <option value="6">Saturday</option>
                                 </select>
                              </div>
                           )}
                           <div>
                              <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Time *</label>
                              <input type="time" value={eventFormData.scheduled_time}
                                 onChange={(e) => setEventFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                                 className="w-full bg-canvas border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors" />
                           </div>
                        </div>
                     )}
                     {eventFormData.is_virtual && (
                        <div>
                           <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Meeting Link</label>
                           <input type="url" placeholder="https://zoom.us/..." value={eventFormData.meeting_link}
                              onChange={(e) => setEventFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
                              className="w-full bg-surface border border-borderSubtle rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-gold transition-colors" />
                        </div>
                     )}
                     <div>
                        <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Banner Image (Optional)</label>
                        <input type="file" accept="image/*"
                           onChange={(e) => { if (e.target.files?.[0]) setEventFormData(prev => ({ ...prev, banner_image: e.target.files![0] })); }}
                           className="w-full text-sm text-inkLight file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold file:text-white hover:file:bg-gold/90 cursor-pointer" />
                     </div>
                     <button type="submit" disabled={isSubmittingEvent}
                        className="w-full bg-gold-gradient text-white font-bold py-3.5 rounded-xl shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {isSubmittingEvent ? (<><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>) : (<><Plus className="w-4 h-4" /> Create Event</>)}
                     </button>
                  </form>
               )}
            </div>

            {/* RealTime Calendar View */}
            <div className="lg:col-span-2 bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-ink">Content Calendar</h3>
                  <div className="flex items-center gap-2 text-sm font-bold text-ink">
                     <button
                        onClick={() => setCurrentCalendarDate(prev => subMonths(prev, 1))}
                        className="p-1 hover:bg-surface rounded-full transition-colors"
                     >
                        <ChevronLeft className="w-4 h-4" />
                     </button>
                     <span>{format(currentCalendarDate, 'MMMM yyyy')}</span>
                     <button
                        onClick={() => setCurrentCalendarDate(prev => addMonths(prev, 1))}
                        className="p-1 hover:bg-surface rounded-full transition-colors"
                     >
                        <ChevronRight className="w-4 h-4" />
                     </button>
                  </div>
               </div>

               <div className="min-h-[400px]">
                  <RealTimeCalendar
                     shows={shows}
                     events={events}
                     currentDate={currentCalendarDate}
                     onDateClick={(date) => {
                        // Pre-fill the form date on click
                        setFormData(prev => ({ ...prev, scheduled_time: date.toISOString().split('T')[0] }));
                     }}
                     onShowClick={(show) => {
                        // Open edit modal when a show is clicked
                        handleEditShow(show);
                     }}
                  />
               </div>
            </div>
         </section>

         {/* 4. Guest Requests & Notifications */}
         <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Guest Requests */}
            <div className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
               <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                     <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Guest Requests</h3>
                  {guestRequests.length > 0 && (
                     <span className="bg-gold text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                        {guestRequests.length}
                     </span>
                  )}
               </div>

               {guestRequests.length === 0 ? (
                  <div className="text-center py-8">
                     <Users className="w-12 h-12 text-inkLight mx-auto mb-4" />
                     <p className="text-inkLight text-sm">No pending guest requests</p>
                     <p className="text-xs text-inkLight mt-2">Guest requests will appear here</p>
                  </div>
               ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                     {guestRequests.map((request) => (
                        <div
                           key={request.id}
                           className="bg-surface rounded-xl p-4 border border-borderSubtle hover:border-purple-500/30 transition-all"
                        >
                           <div className="flex items-start gap-3">
                              <img
                                 src={request.requester.profile_picture || '/default-avatar.png'}
                                 alt={request.requester.username}
                                 className="w-10 h-10 rounded-full object-cover"
                              />
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-bold text-ink text-sm">{request.requester.username}</h4>
                                    {request.requester.is_verified && (
                                       <svg className="w-3.5 h-3.5 text-gold flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                       </svg>
                                    )}
                                 </div>
                                 <p className="text-xs text-inkSubtle">
                                    Wants to be a guest on <span className="font-semibold text-ink">{request.show.title}</span>
                                 </p>
                                 {request.message && (
                                    <p className="text-xs text-inkLight mt-2 italic line-clamp-2">"{request.message}"</p>
                                 )}
                                 <div className="flex gap-2 mt-3">
                                    <button
                                       onClick={async () => {
                                          if (!accessToken) return;
                                          try {
                                             await acceptGuestRequest(request.id, accessToken);
                                             setGuestRequests(prev => prev.filter(r => r.id !== request.id));
                                             setToastMessage('Guest request accepted! ✅');
                                             setToastType('success');
                                             setShowSuccessToast(true);
                                             setTimeout(() => setShowSuccessToast(false), 3000);
                                          } catch (error) {
                                             console.error('Failed to accept:', error);
                                             setToastMessage('Failed to accept request');
                                             setToastType('error');
                                             setShowSuccessToast(true);
                                             setTimeout(() => setShowSuccessToast(false), 3000);
                                          }
                                       }}
                                       className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center justify-center gap-1"
                                    >
                                       <Check className="w-3 h-3" />
                                       Accept
                                    </button>
                                    <button
                                       onClick={async () => {
                                          if (!accessToken) return;
                                          try {
                                             await declineGuestRequest(request.id, accessToken);
                                             setGuestRequests(prev => prev.filter(r => r.id !== request.id));
                                          } catch (error) {
                                             console.error('Failed to decline:', error);
                                             alert('Failed to decline request.');
                                          }
                                       }}
                                       className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all flex items-center justify-center gap-1"
                                    >
                                       <X className="w-3 h-3" />
                                       Decline
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>


            {/* Notifications Feed */}
            <div className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
               <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                     <Bell className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-ink">Notifications</h3>
                  {notifications.filter(n => !n.is_read).length > 0 && (
                     <span className="bg-gold text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {notifications.filter(n => !n.is_read).length}
                     </span>
                  )}
                  {notifications.length > 0 && (
                     <button
                        onClick={async () => {
                           if (!accessToken) return;
                           try {
                              await markAllNotificationsRead(accessToken);
                              setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                           } catch (error) {
                              console.error('Failed to mark all as read:', error);
                           }
                        }}
                        className="ml-auto text-xs font-bold text-inkLight hover:text-ink"
                     >
                        Mark all read
                     </button>
                  )}
               </div>

               <div className="space-y-4">
                  {isLoadingNotifications ? (
                     <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                     </div>
                  ) : notifications.length === 0 ? (
                     <div className="text-center py-8">
                        <Bell className="w-12 h-12 text-inkLight mx-auto mb-4" />
                        <p className="text-inkLight text-sm">No notifications yet</p>
                     </div>
                  ) : (
                     notifications.slice(0, 5).map((notification) => {
                        const getNotificationContent = () => {
                           switch (notification.notification_type) {
                              case 'follow':
                                 return {
                                    icon: Users,
                                    color: 'text-blue-500 bg-blue-50',
                                    title: 'New Follower',
                                    message: `${notification.actor.username} started following you`
                                 };
                              case 'like':
                                 return {
                                    icon: Heart,
                                    color: 'text-red-500 bg-red-50',
                                    title: 'New Like',
                                    message: `${notification.actor.username} liked your content`
                                 };
                              case 'comment':
                                 return {
                                    icon: MessageSquare,
                                    color: 'text-green-500 bg-green-50',
                                    title: 'New Comment',
                                    message: `${notification.actor.username} commented on your content`
                                 };
                              case 'guest_request':
                                 return {
                                    icon: Users,
                                    color: 'text-purple-500 bg-purple-50',
                                    title: 'Guest Request',
                                    message: notification.message || `${notification.actor.username} wants to be on your show`
                                 };
                              case 'guest_accepted':
                                 return {
                                    icon: Check,
                                    color: 'text-green-500 bg-green-50',
                                    title: 'Guest Request Accepted',
                                    message: `${notification.actor.username} accepted your guest request`
                                 };
                              case 'guest_declined':
                                 return {
                                    icon: X,
                                    color: 'text-red-500 bg-red-50',
                                    title: 'Guest Request Declined',
                                    message: `${notification.actor.username} declined your guest request`
                                 };
                              default:
                                 return {
                                    icon: Bell,
                                    color: 'text-inkLight bg-surface',
                                    title: 'Notification',
                                    message: notification.message || 'You have a new notification'
                                 };
                           }
                        };

                        const content = getNotificationContent();
                        const timeAgo = new Date(notification.created_at).toLocaleDateString();

                        return (
                           <div
                              key={notification.id}
                              onClick={async () => {
                                 if (!notification.is_read && accessToken) {
                                    try {
                                       await markNotificationRead(notification.id, accessToken);
                                       setNotifications(prev =>
                                          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
                                       );
                                    } catch (error) {
                                       console.error('Failed to mark as read:', error);
                                    }
                                 }
                                 // Navigate based on notification type
                                 if (notification.notification_type === 'guest_request' && notification.actor?.id) {
                                    onNavigate('creator-detail', notification.actor.id);
                                 } else if (notification.notification_type === 'guest_accepted' && notification.object_id) {
                                    // Fetch show to get slug for navigation
                                    try {
                                       const show = await fetchShowByPk(notification.object_id);
                                       if (show) onNavigate('show-detail', show.slug);
                                    } catch { console.error('Could not navigate to show'); }
                                 } else if (notification.notification_type === 'guest_declined' && notification.actor?.id) {
                                    onNavigate('creator-detail', notification.actor.id);
                                 } else if (notification.notification_type === 'follow' && notification.actor?.id) {
                                    onNavigate('creator-detail', notification.actor.id);
                                 } else if ((notification.notification_type === 'like' || notification.notification_type === 'comment') && notification.object_id) {
                                    // Fetch show to get slug for navigation
                                    try {
                                       const show = await fetchShowByPk(notification.object_id);
                                       if (show) onNavigate('show-detail', show.slug);
                                    } catch { console.error('Could not navigate to show'); }
                                 }
                              }}
                              className={`flex gap-4 p-3 rounded-2xl transition-colors cursor-pointer group ${notification.is_read ? 'hover:bg-surface' : 'bg-gold/5 hover:bg-gold/10 border border-gold/20'
                                 }`}
                           >
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${content.color}`}>
                                 <content.icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                 <div className="flex justify-between items-start">
                                    <h4 className="text-sm font-bold text-ink group-hover:text-gold transition-colors">
                                       {content.title}
                                    </h4>
                                    <span className="text-[10px] text-inkLight font-semibold">{timeAgo}</span>
                                 </div>
                                 <p className="text-xs text-inkLight mt-0.5">{content.message}</p>
                              </div>
                              {!notification.is_read && (
                                 <div className="w-2 h-2 bg-gold rounded-full shrink-0 mt-2" />
                              )}
                           </div>
                        );
                     })
                  )}
               </div>
            </div>
         </section>

         {/* 5. Recent Shows with Stats */}
         <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-ink">Your Shows</h3>
               <button className="text-xs font-bold text-gold hover:underline">View All</button>
            </div>

            {isLoadingShows ? (
               <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
               </div>
            ) : shows.length === 0 ? (
               <div className="text-center py-12">
                  <Video className="w-12 h-12 text-inkLight mx-auto mb-4" />
                  <p className="text-inkLight text-sm">No shows yet.</p>
                  <p className="text-xs text-inkLight mt-2">Create your first show to get started!</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {shows.slice(0, 5).map(show => (
                     <div key={show.id} className="flex items-center gap-4 p-4 border border-borderSubtle rounded-xl hover:bg-surface transition-colors cursor-pointer">
                        <div className="w-20 aspect-video rounded-lg overflow-hidden bg-surface shrink-0">
                           {show.thumbnail ? (
                              <img src={show.thumbnail} alt={show.title} className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                 <Video className="w-6 h-6 text-gold" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1">
                           <h4 className="font-bold text-ink text-sm mb-1">{show.title}</h4>
                           <div className="flex items-center gap-4 text-xs text-inkLight">
                              <span className="flex items-center gap-1">
                                 <Heart className="w-3 h-3" /> {show.like_count}
                              </span>
                              <span className="flex items-center gap-1">
                                 <MessageSquare className="w-3 h-3" /> {show.comment_count}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${show.status === 'published' ? 'bg-green-50 text-green-700' :
                                 show.status === 'draft' ? 'bg-surface 100 text-inkLight' :
                                    'bg-yellow-50 text-yellow-700'
                                 }`}>
                                 {show.status}
                              </span>
                           </div>
                        </div>
                        <button
                           onClick={() => handleEditShow(show)}
                           className="text-inkLight hover:text-gold transition-colors"
                           title="Edit show"
                        >
                           <MoreHorizontal className="w-4 h-4" />
                        </button>
                     </div>
                  ))}
               </div>
            )}
         </section>

         {/* 6. Recent Events with Stats */}
         <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-ink">Your Events</h3>
               <button className="text-xs font-bold text-gold hover:underline">View All</button>
            </div>

            {isLoadingEvents ? (
               <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-gold animate-spin" />
               </div>
            ) : events.length === 0 ? (
               <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-inkLight mx-auto mb-4" />
                  <p className="text-inkLight text-sm">No events yet.</p>
                  <p className="text-xs text-inkLight mt-2">Create your first event to get started!</p>
               </div>
            ) : (
               <div className="space-y-4">
                  {events.slice(0, 5).map(event => (
                     <div key={event.id} className="flex items-center gap-4 p-4 border border-borderSubtle rounded-xl hover:bg-surface transition-colors cursor-pointer"
                        onClick={() => onNavigate('event-detail', String(event.id))}
                     >
                        <div className="w-20 aspect-video rounded-lg overflow-hidden bg-surface shrink-0">
                           {event.banner_image ? (
                              <img src={event.banner_image} alt={event.title} className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center bg-purple-500/10">
                                 <CalendarIcon className="w-6 h-6 text-purple-500" />
                              </div>
                           )}
                        </div>
                        <div className="flex-1">
                           <h4 className="font-bold text-ink text-sm mb-1">{event.title}</h4>
                           <div className="flex items-center gap-4 text-xs text-inkLight">
                              <span className="flex items-center gap-1">
                                 <Heart className="w-3 h-3" /> {event.like_count}
                              </span>
                              <span className="flex items-center gap-1">
                                 <MessageSquare className="w-3 h-3" /> {event.comment_count}
                              </span>
                              {event.is_recurring && (
                                 <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700">
                                    {event.recurrence_type === 'DAILY' ? 'Daily' :
                                       event.recurrence_type === 'WEEKDAYS' ? 'Weekdays' :
                                          event.recurrence_type === 'WEEKENDS' ? 'Weekends' :
                                             event.recurrence_type === 'SPECIFIC_DAY' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][event.day_of_week || 0] : 'Recurring'}
                                 </span>
                              )}
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${event.status === 'upcoming' ? 'bg-green-50 text-green-700' :
                                 event.status === 'ongoing' ? 'bg-blue-50 text-blue-700' :
                                    event.status === 'past' ? 'bg-surface text-inkLight' :
                                       'bg-yellow-50 text-yellow-700'
                                 }`}>
                                 {event.status}
                              </span>
                           </div>
                        </div>
                        <button
                           onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                           }}
                           className="text-inkLight hover:text-gold transition-colors"
                           title="Edit event"
                        >
                           <MoreHorizontal className="w-4 h-4" />
                        </button>
                     </div>
                  ))}
               </div>
            )}
         </section>

         {/* Toast Notification */}
         {showSuccessToast && (
            <motion.div
               initial={{ opacity: 0, y: 50 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 50 }}
               className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 ${toastType === 'success' ? 'bg-green-500' : 'bg-red-500'
                  } text-white`}
            >
               {toastType === 'success' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
               ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
               )}
               <span className="font-bold">{toastMessage}</span>
            </motion.div>
         )}


         {/* Edit Show Modal */}
         {showToEdit && (
            <EditShowModal
               show={showToEdit}
               isOpen={isEditModalOpen}
               onClose={() => {
                  setIsEditModalOpen(false);
                  setShowToEdit(null);
               }}
               onSuccess={handleEditSuccess}
            />
         )}

         {/* Edit Event Modal */}
         {eventToEdit && (
            <EditEventModal
               event={eventToEdit}
               isOpen={isEditEventModalOpen}
               onClose={() => {
                  setIsEditEventModalOpen(false);
                  setEventToEdit(null);
               }}
               onSuccess={handleEditEventSuccess}
            />
         )}

      </div>
   );
};

// Helper Component for Stats Cards
const StatsCard: React.FC<{
   icon: React.ElementType;
   label: string;
   value: string;
   color: string;
   isLoading: boolean;
}> = ({ icon: Icon, label, value, color, isLoading }) => (
   <div className="bg-canvas border border-borderSubtle rounded-2xl p-6 shadow-sm">
      {isLoading ? (
         <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
         </div>
      ) : (
         <>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${color}`}>
               <Icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-ink mb-1">{value}</div>
            <div className="text-xs text-inkLight font-medium">{label}</div>
         </>
      )}
   </div>
);

// Helper Component for Notifications
const NotificationItem: React.FC<{
   icon: React.ElementType;
   color: string;
   title: string;
   message: string;
   time: string;
}> = ({ icon: Icon, color, title, message, time }) => (
   <div className="flex gap-4 p-3 rounded-2xl hover:bg-surface transition-colors cursor-pointer group">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
         <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
         <div className="flex justify-between items-start">
            <h4 className="text-sm font-bold text-ink group-hover:text-gold transition-colors">{title}</h4>
            <span className="text-[10px] text-inkLight font-semibold">{time}</span>
         </div>
         <p className="text-xs text-inkLight mt-0.5">{message}</p>
      </div>
   </div>
);



