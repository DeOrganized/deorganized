import React, { useState, useEffect } from 'react';
import {
   User, Settings, Clock, Heart, Shield, Zap,
   LogOut, Play, MoreHorizontal, MessageSquare,
   ThumbsUp, ExternalLink, CreditCard, Award, Loader2,
   UserPlus, Share2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import {
   fetchUserProfile,
   fetchUserFollowing,
   getUserLikedShows,
   fetchNotifications,
   UserProfile,
   Creator,
   Show,
   Notification
} from '../lib/api';

interface UserDashboardProps {
   onNavigate: (page: string) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate }) => {
   const { backendUser, accessToken, logout } = useAuth();
   const [activeTab, setActiveTab] = useState<'history' | 'liked' | 'activity'>('liked');

   // Data states
   const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
   const [following, setFollowing] = useState<Creator[]>([]);
   const [likedShows, setLikedShows] = useState<Show[]>([]);

   // Loading states  
   const [isLoadingProfile, setIsLoadingProfile] = useState(true);
   const [isLoadingFollowing, setIsLoadingFollowing] = useState(true);
   const [isLoadingLiked, setIsLoadingLiked] = useState(true);
   const [isLoadingActivity, setIsLoadingActivity] = useState(false);

   // Activity feed
   const [activities, setActivities] = useState<Notification[]>([]);

   // Error states
   const [profileError, setProfileError] = useState<string | null>(null);

   // Load activity feed
   useEffect(() => {
      const loadActivity = async () => {
         if (!accessToken || activeTab !== 'activity') return;
         try {
            setIsLoadingActivity(true);
            const notifs = await fetchNotifications(accessToken);
            setActivities(notifs);
         } catch (error) {
            console.error('Failed to load activity:', error);
         } finally {
            setIsLoadingActivity(false);
         }
      };
      loadActivity();
   }, [accessToken, activeTab]);

   // Fetch user profile data
   useEffect(() => {
      const loadUserProfile = async () => {
         if (!backendUser?.id || !accessToken) return;

         try {
            setIsLoadingProfile(true);
            const profile = await fetchUserProfile(backendUser.id, accessToken);
            setUserProfile(profile);
            setProfileError(null);
         } catch (error: any) {
            console.error('Failed to load user profile:', error);
            setProfileError(error.message);
         } finally {
            setIsLoadingProfile(false);
         }
      };

      loadUserProfile();
   }, [backendUser?.id, accessToken]);

   // Fetch following list
   useEffect(() => {
      const loadFollowing = async () => {
         if (!backendUser?.id || !accessToken) return;

         try {
            setIsLoadingFollowing(true);
            const followingList = await fetchUserFollowing(backendUser.id);
            setFollowing(followingList);
         } catch (error) {
            console.error('Failed to load following:', error);
         } finally {
            setIsLoadingFollowing(false);
         }
      };

      loadFollowing();
   }, [backendUser?.id, accessToken]);

   // Fetch liked shows
   useEffect(() => {
      const loadLikedShows = async () => {
         if (!backendUser?.id || !accessToken) return;

         try {
            setIsLoadingLiked(true);
            const liked = await getUserLikedShows(backendUser.id, accessToken);
            setLikedShows(liked);
         } catch (error) {
            console.error('Failed to load liked shows:', error);
         } finally {
            setIsLoadingLiked(false);
         }
      };

      loadLikedShows();
   }, [backendUser?.id, accessToken]);

   if (!backendUser) {
      return (
         <div className="min-h-screen pt-24 pb-20 container max-w-[1024px] mx-auto px-6 flex items-center justify-center">
            <p className="text-inkLight">Please log in to view your dashboard.</p>
         </div>
      );
   }

   const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
   };

   const formatWalletAddress = (address: string) => {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
   };

   return (
      <div className="min-h-screen pt-24 pb-20 container max-w-[1024px] mx-auto px-6 space-y-8">

         {/* Header */}
         <div className="flex justify-between items-end">
            <div>
               <h1 className="text-4xl font-bold text-ink mb-2">My Dashboard</h1>
               <p className="text-inkLight font-medium">
                  Welcome back, {backendUser.username || 'User'}.
               </p>
            </div>
            <button
               onClick={logout}
               className="flex items-center gap-2 text-sm font-bold text-ink hover:text-red-500 transition-colors"
            >
               <LogOut className="w-4 h-4" /> Sign Out
            </button>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Column: Profile & Stats */}
            <div className="lg:col-span-1 space-y-8">

               {/* Profile Card */}
               <div className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-24 bg-gold-gradient opacity-10" />

                  {isLoadingProfile ? (
                     <div className="relative z-10 flex flex-col items-center text-center mt-4">
                        <Loader2 className="w-12 h-12 text-gold animate-spin mb-4" />
                        <p className="text-inkLight text-sm">Loading profile...</p>
                     </div>
                  ) : profileError ? (
                     <div className="relative z-10 flex flex-col items-center text-center mt-4">
                        <p className="text-red-500 text-sm mb-2">Failed to load profile</p>
                        <p className="text-xs text-inkLight">{profileError}</p>
                     </div>
                  ) : (
                     <div className="relative z-10 flex flex-col items-center text-center mt-4">
                        <div className="w-24 h-24 rounded-full border-4 border-borderSubtle shadow-md overflow-hidden mb-4 relative bg-surface">
                           {userProfile?.profile_picture ? (
                              <img src={userProfile.profile_picture} alt="User" className="w-full h-full object-cover" />
                           ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                 <User className="w-12 h-12 text-gold" />
                              </div>
                           )}
                        </div>
                        <h2 className="text-xl font-bold text-ink">{userProfile?.username || backendUser.username}</h2>
                        <p className="text-inkLight text-sm font-medium mb-4">
                           Member since {userProfile?.date_joined ? formatDate(userProfile.date_joined) : '2024'}
                        </p>

                        {userProfile?.stacks_address && (
                           <div className="flex items-center gap-2 bg-surface border border-borderSubtle px-3 py-1.5 rounded-full text-xs font-bold text-inkLight mb-6 cursor-pointer hover:border-gold hover:text-gold transition-colors">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              {formatWalletAddress(userProfile.stacks_address)}
                              <ExternalLink className="w-3 h-3" />
                           </div>
                        )}

                        {/* Follower/Following Stats */}
                        <div className="flex gap-6 mb-6 w-full justify-center">
                           <div className="text-center">
                              <p className="text-2xl font-bold text-ink">{userProfile?.following_count || 0}</p>
                              <p className="text-xs text-inkLight font-medium">Following</p>
                           </div>
                           <div className="text-center">
                              <p className="text-2xl font-bold text-ink">{userProfile?.follower_count || 0}</p>
                              <p className="text-xs text-inkLight font-medium">Followers</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                           <button
                              onClick={() => onNavigate('edit-profile')}
                              className="flex-1 bg-transparent border border-borderSubtle text-ink text-sm font-bold py-2.5 rounded-xl hover:border-gold hover:text-gold transition-colors shadow-sm"
                           >
                              Edit Profile
                           </button>
                           <button className="flex-1 bg-canvas border border-borderSubtle text-ink text-sm font-bold py-2.5 rounded-xl hover:bg-surface transition-colors flex items-center justify-center gap-2">
                              <Settings className="w-4 h-4" /> Settings
                           </button>
                        </div>
                     </div>
                  )}
               </div>

               {/* Membership / Points Card */}
               <div className="bg-transparent border border-borderSubtle text-ink rounded-3xl p-6 shadow-soft relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gold rounded-full opacity-10 blur-[50px] -translate-y-1/2 translate-x-1/2" />

                  <div className="relative z-10">
                     <div className="flex justify-between items-start mb-6">
                        <div className="bg-surface p-2 rounded-lg border border-borderSubtle">
                           <Shield className="w-6 h-6 text-gold" />
                        </div>
                     </div>

                     <h3 className="text-3xl font-bold mb-1">0</h3>
                     <p className="text-ink/60 text-sm font-medium mb-6">DeOrg Points Coming Soon</p>

                     <div className="space-y-3">
                        <div className="flex justify-between text-xs font-medium">
                           <span className="text-ink/60">Welcome Bonus Coming Soon</span>
                           <span className="text-gold">0%</span>
                        </div>
                        <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-borderSubtle/50">
                           <div className="h-full bg-gold w-[0%] rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                        </div>
                     </div>

                     <button className="w-full mt-6 bg-surface hover:bg-gold hover:text-white text-ink font-bold py-3 rounded-xl transition-all border border-borderSubtle shadow-sm">
                        View Rewards
                     </button>
                  </div>
               </div>

            </div>

            {/* Right Column: Content Modules */}
            <div className="lg:col-span-2 space-y-8">

               {/* Subscriptions/Following Module */}
               <section>
                  <div className="flex justify-between items-center mb-4 px-1">
                     <h3 className="text-lg font-bold text-ink">Following ({following.length})</h3>
                     <button className="text-xs font-bold text-gold hover:underline">View All</button>
                  </div>

                  {isLoadingFollowing ? (
                     <div className="flex gap-4 overflow-x-auto pb-4">
                        {[1, 2, 3].map(i => (
                           <div key={i} className="min-w-[140px] bg-canvas border border-borderSubtle rounded-2xl p-4 animate-pulse">
                              <div className="w-16 h-16 rounded-full bg-surface mb-3" />
                              <div className="h-4 bg-surface rounded mb-2" />
                              <div className="h-3 bg-surface rounded w-2/3" />
                           </div>
                        ))}
                     </div>
                  ) : following.length === 0 ? (
                     <div className="bg-canvas border border-borderSubtle rounded-2xl p-8 text-center">
                        <p className="text-inkLight text-sm">You're not following anyone yet.</p>
                        <p className="text-xs text-inkLight mt-2">Discover creators and start following!</p>
                     </div>
                  ) : (
                     <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                        {following.map((creator) => (
                           <div key={creator.id} className="min-w-[140px] bg-canvas border border-borderSubtle rounded-2xl p-4 flex flex-col items-center text-center hover:border-gold/50 hover:shadow-soft transition-all cursor-pointer group">
                              <div className="w-16 h-16 rounded-full border-2 border-surface mb-3 overflow-hidden group-hover:scale-105 transition-transform bg-surface">
                                 {creator.profile_picture ? (
                                    <img src={creator.profile_picture} alt={creator.username} className="w-full h-full object-cover" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                       <User className="w-8 h-8 text-gold" />
                                    </div>
                                 )}
                              </div>
                              <h4 className="text-sm font-bold text-ink truncate w-full">{creator.username}</h4>
                              <p className="text-xs text-inkLight mb-3 truncate w-full">{creator.bio || 'Creator'}</p>
                              <button className="text-xs bg-surface text-inkLight font-bold px-3 py-1 rounded-full border border-borderSubtle group-hover:bg-gold group-hover:text-white group-hover:border-gold transition-colors">
                                 Following
                              </button>
                           </div>
                        ))}
                     </div>
                  )}
               </section>

               {/* Main Content Tabs */}
               <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft min-h-[500px]">

                  {/* Tab Navigation */}
                  <div className="flex items-center gap-6 border-b border-borderSubtle pb-4 mb-6">
                     {[
                        { id: 'liked', label: 'Liked Shows', icon: Heart },
                        { id: 'history', label: 'Watch History', icon: Clock },
                        { id: 'activity', label: 'Activity Feed', icon: Zap },
                     ].map((tab) => (
                        <button
                           key={tab.id}
                           onClick={() => setActiveTab(tab.id as any)}
                           className={`flex items-center gap-2 text-sm font-bold pb-4 -mb-8 transition-all relative ${activeTab === tab.id
                              ? 'text-ink'
                              : 'text-inkLight hover:text-ink'
                              }`}
                        >
                           <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-gold' : ''}`} />
                           {tab.label}
                           {activeTab === tab.id && (
                              <motion.div layoutId="activeTab" className="absolute bottom-4 left-0 w-full h-0.5 bg-gold" />
                           )}
                        </button>
                     ))}
                  </div>

                  {/* Tab Content */}
                  <div className="space-y-6">

                     {activeTab === 'liked' && (
                        <>
                           {isLoadingLiked ? (
                              <div className="flex items-center justify-center py-12">
                                 <Loader2 className="w-8 h-8 text-gold animate-spin" />
                              </div>
                           ) : likedShows.length === 0 ? (
                              <div className="text-center py-12">
                                 <Heart className="w-12 h-12 text-inkLight mx-auto mb-4" />
                                 <p className="text-inkLight text-sm">No liked shows yet.</p>
                                 <p className="text-xs text-inkLight mt-2">Start exploring and like shows you enjoy!</p>
                              </div>
                           ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 {likedShows.map(show => (
                                    <div key={show.id} className="group cursor-pointer">
                                       <div className="rounded-xl overflow-hidden aspect-video mb-3 relative bg-surface">
                                          {show.thumbnail ? (
                                             <img src={show.thumbnail} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt={show.title} />
                                          ) : (
                                             <div className="w-full h-full flex items-center justify-center bg-gold/10">
                                                <Play className="w-8 h-8 text-gold" />
                                             </div>
                                          )}
                                          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur rounded-full p-1.5 text-gold">
                                             <Heart className="w-3 h-3 fill-gold" />
                                          </div>
                                       </div>
                                       <h4 className="font-bold text-ink text-sm mb-1 truncate group-hover:text-gold transition-colors">{show.title}</h4>
                                       <p className="text-xs text-inkLight">{show.creator.username}</p>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </>
                     )}

                     {activeTab === 'history' && (
                        <div className="text-center py-12">
                           <Clock className="w-12 h-12 text-inkLight mx-auto mb-4" />
                           <p className="text-inkLight text-sm">Watch history coming soon!</p>
                           <p className="text-xs text-inkLight mt-2">We're building this feature for you.</p>
                        </div>
                     )}

                     {activeTab === 'activity' && (
                        <>
                           {isLoadingActivity ? (
                              <div className="flex items-center justify-center py-12">
                                 <Loader2 className="w-8 h-8 text-gold animate-spin" />
                              </div>
                           ) : activities.length === 0 ? (
                              <div className="text-center py-12">
                                 <Zap className="w-12 h-12 text-inkLight mx-auto mb-4" />
                                 <p className="text-inkLight text-sm">No activity yet.</p>
                                 <p className="text-xs text-inkLight mt-2">Your interactions will show up here.</p>
                              </div>
                           ) : (
                              <div className="space-y-3">
                                 {activities.map((item) => {
                                    const getIcon = () => {
                                       switch (item.notification_type) {
                                          case 'like': return <Heart className="w-4 h-4 text-red-500" />;
                                          case 'comment': return <MessageSquare className="w-4 h-4 text-blue-500" />;
                                          case 'follow': return <UserPlus className="w-4 h-4 text-green-500" />;
                                          case 'share': return <Share2 className="w-4 h-4 text-purple-500" />;
                                          default: return <Zap className="w-4 h-4 text-gold" />;
                                       }
                                    };
                                    const getColor = () => {
                                       switch (item.notification_type) {
                                          case 'like': return 'bg-red-500/10';
                                          case 'comment': return 'bg-blue-500/10';
                                          case 'follow': return 'bg-green-500/10';
                                          case 'share': return 'bg-purple-500/10';
                                          default: return 'bg-gold/10';
                                       }
                                    };
                                    const timeAgo = (dateStr: string) => {
                                       const diff = Date.now() - new Date(dateStr).getTime();
                                       const mins = Math.floor(diff / 60000);
                                       if (mins < 60) return `${mins}m ago`;
                                       const hours = Math.floor(mins / 60);
                                       if (hours < 24) return `${hours}h ago`;
                                       return `${Math.floor(hours / 24)}d ago`;
                                    };
                                    return (
                                       <div
                                          key={item.id}
                                          className={`flex items-center gap-3 p-3 rounded-xl ${!item.is_read ? 'bg-gold/5 border border-gold/20' : 'bg-surface border border-borderSubtle'}`}
                                       >
                                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${getColor()}`}>
                                             {getIcon()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <p className="text-sm text-ink">
                                                <span className="font-bold">{typeof item.actor === 'object' ? item.actor.username : 'Someone'}</span>
                                                {' '}{item.notification_type === 'like' ? 'liked your' : item.notification_type === 'comment' ? 'commented on your' : item.notification_type === 'follow' ? 'started following you' : 'shared your'}
                                                {item.notification_type !== 'follow' && item.show_slug && (
                                                   <span className="font-semibold text-gold"> {item.show_title || 'show'}</span>
                                                )}
                                             </p>
                                             <p className="text-xs text-inkLight mt-0.5">{timeAgo(item.created_at)}</p>
                                          </div>
                                          {!item.is_read && (
                                             <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0" />
                                          )}
                                       </div>
                                    );
                                 })}
                              </div>
                           )}
                        </>
                     )}

                  </div>
               </section>

            </div>
         </div>
      </div>
   );
};


