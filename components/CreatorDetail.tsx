import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Link as LinkIcon, Users, CheckCircle, Calendar, Video, Heart, MessageSquare, Twitter, Instagram, Youtube, Share2, ShoppingBag, CreditCard, Loader2, Send } from 'lucide-react';
import { fetchCreatorById, fetchCreatorByUsername, fetchCreatorShows, checkIsFollowing, toggleFollow, fetchMerchList, createMerchOrder, findOrCreateThread, Creator, Show, Merch, getImageUrl } from '../lib/api';
import { useToast } from './Toast';
import { useAuth } from '../lib/AuthContext';
import { FollowersList } from './FollowersList';
import { motion } from 'framer-motion';
import TipModal from './TipModal';

interface CreatorDetailProps {
   onNavigate: (page: string, id?: string | number) => void;
   creatorId: string | number;
}

export const CreatorDetail: React.FC<CreatorDetailProps> = ({ onNavigate, creatorId }) => {
   const { backendUser, accessToken, connectWallet, walletAddress } = useAuth();
   const toast = useToast();
   const [creator, setCreator] = useState<Creator | null>(null);
   const [shows, setShows] = useState<Show[]>([]);
   const [loading, setLoading] = useState(true);
   const [loadingShows, setLoadingShows] = useState(true);
   const [isFollowing, setIsFollowing] = useState(false);
   const [followLoading, setFollowLoading] = useState(false);
   const [showFollowersModal, setShowFollowersModal] = useState(false);
   const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');
   const [activeTab, setActiveTab] = useState<'shows' | 'merch'>('shows');
   const [merch, setMerch] = useState<Merch[]>([]);
   const [loadingMerch, setLoadingMerch] = useState(false);
   const [buyLoading, setBuyLoading] = useState<Record<number, boolean>>({});
   const [showSharePopup, setShowSharePopup] = useState(false);
   const [showTipModal, setShowTipModal] = useState(false);
   const [dmLoading, setDmLoading] = useState(false);
   const [merchPayToken, setMerchPayToken] = useState<'STX' | 'USDCx' | 'sBTC'>('USDCx');

   const loadMerch = async () => {
      if (!creator) return;
      try {
         setLoadingMerch(true);
         const merchData = await fetchMerchList(creator.id);
         setMerch(merchData);
      } catch (error) {
         console.error('Failed to load merch:', error);
      } finally {
         setLoadingMerch(false);
      }
   };

   useEffect(() => {
      if (activeTab === 'merch' && merch.length === 0) {
         loadMerch();
      }
   }, [activeTab, creator]);

   useEffect(() => {
      const loadCreator = async () => {
         try {
            // If creatorId is a number or numeric string, fetch by ID; otherwise by username
            let data: Creator;
            const numericId = typeof creatorId === 'number' ? creatorId : Number(creatorId);
            if (!isNaN(numericId) && String(numericId) === String(creatorId)) {
               data = await fetchCreatorById(numericId);
            } else {
               data = await fetchCreatorByUsername(String(creatorId));
            }
            setCreator(data);

            // Check if current user is following this creator
            if (backendUser && accessToken && backendUser.id !== data.id) {
               try {
                  const following = await checkIsFollowing(data.id, backendUser.id, accessToken);
                  setIsFollowing(following);
               } catch (error) {
                  console.error('Failed to check follow status:', error);
               }
            }
         } catch (error) {
            console.error('Failed to load creator:', error);
         } finally {
            setLoading(false);
         }
      };

      loadCreator();
   }, [creatorId, backendUser, accessToken]);

   // Load shows when creator is resolved
   useEffect(() => {
      if (!creator) return;
      const loadShows = async () => {
         try {
            const showsData = await fetchCreatorShows(creator.id, undefined, 'published');
            setShows(showsData);
         } catch (error) {
            console.error('Failed to load shows:', error);
         } finally {
            setLoadingShows(false);
         }
      };
      loadShows();
   }, [creator]);

   const handleFollowToggle = async () => {
      if (!backendUser || !accessToken) {
         // Trigger wallet connection instead of showing alert
         connectWallet();
         return;
      }

      try {
         setFollowLoading(true);
         if (!creator) return;
         await toggleFollow(creator.id, accessToken);
         setIsFollowing(!isFollowing);
      } catch (error) {
         console.error('Failed to toggle follow:', error);
         toast.error('Failed to update follow status');
      } finally {
         setFollowLoading(false);
      }
   };

   const handleBuyMerch = async (merchItem: Merch) => {
      if (!backendUser || !accessToken) {
         connectWallet();
         return;
      }

      try {
         setBuyLoading(prev => ({ ...prev, [merchItem.id]: true }));
         const order = await createMerchOrder({
            merch: merchItem.id,
            quantity: 1,
            payment_currency: merchPayToken,
         } as any, accessToken, {
            senderAddress: walletAddress || backendUser?.stacks_address || '',
            tokenType: merchPayToken,
         });
         
         const txUrl = order.tx_id ? ` (https://explorer.hiro.so/txid/${order.tx_id}?chain=testnet)` : '';
         toast.success(`Order placed successfully for ${merchItem.name}!${txUrl}`);
      } catch (error: any) {
         if (error.name === 'PaymentCancelledError') {
            console.log('User cancelled payment');
         } else {
            console.error('Failed to purchase merch:', error);
            toast.error(error.message || 'Failed to complete purchase');
         }
      } finally {
         setBuyLoading(prev => ({ ...prev, [merchItem.id]: false }));
      }
   };

   const handleShare = () => {
      if (!creator) return;
      const shareUrl = `${window.location.origin}/creators/${creator.username}`;
      navigator.clipboard.writeText(shareUrl);
      setShowSharePopup(true);
      setTimeout(() => setShowSharePopup(false), 2000);
   };

   if (loading) {
      return (
         <div className="min-h-screen pt-24 flex items-center justify-center">
            <p className="text-inkLight">Loading creator...</p>
         </div>
      );
   }

   if (!creator) {
      return (
         <div className="min-h-screen pt-24 pb-20 bg-canvas">
            <div className="container max-w-[1280px] mx-auto px-6">
               <button
                  onClick={() => onNavigate('creators')}
                  className="flex items-center gap-2 text-sm font-bold text-inkLight hover:text-gold transition-colors mb-6"
               >
                  <ArrowLeft className="w-4 h-4" /> Back to Creators
               </button>
               <div className="text-center py-20">
                  <div className="text-6xl mb-4">👤</div>
                  <h2 className="text-2xl font-bold text-ink mb-2">Creator not found</h2>
                  <p className="text-inkLight">This creator profile doesn't exist.</p>
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen pt-24 pb-20 bg-canvas">
         <div className="container max-w-[1280px] mx-auto px-6">

            <button
               onClick={() => onNavigate('creators')}
               className="flex items-center gap-2 text-sm font-bold text-inkLight hover:text-gold transition-colors mb-6"
            >
               <ArrowLeft className="w-4 h-4" /> Back to Creators
            </button>

            {/* Profile Header */}
            <div className="bg-canvas rounded-3xl border border-borderSubtle shadow-soft p-6 md:p-12 mb-8">
               <div className="flex flex-col md:flex-row gap-6 md:items-start">
                  {/* Avatar */}
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-borderSubtle bg-surface overflow-hidden shadow-lg flex-shrink-0">
                     <img
                        src={getImageUrl(creator.profile_picture) || "https://picsum.photos/200/200"}
                        alt={creator.username}
                        className="w-full h-full object-cover"
                     />
                  </div>

                  {/* Name & Stats */}
                  <div className="flex-1">
                     <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div>
                           <h1 className="text-3xl md:text-4xl font-bold text-ink flex items-center gap-2">
                              {creator.username}
                              {creator.is_verified && (
                                 <CheckCircle className="w-6 h-6 text-gold" />
                              )}
                           </h1>
                           <p className="text-inkLight font-medium mb-2">@{creator.username.toLowerCase()}</p>
                           <div className="flex items-center gap-4">
                              <button
                                 onClick={() => { setFollowersModalTab('followers'); setShowFollowersModal(true); }}
                                 className="text-sm hover:text-gold transition-colors"
                              >
                                 <strong className="text-ink">{creator.follower_count || 0}</strong>
                                 <span className="text-inkLight"> followers</span>
                              </button>
                              <button
                                 onClick={() => { setFollowersModalTab('following'); setShowFollowersModal(true); }}
                                 className="text-sm hover:text-gold transition-colors"
                              >
                                 <strong className="text-ink">{creator.following_count || 0}</strong>
                                 <span className="text-inkLight"> following</span>
                              </button>
                              <span className="inline-block px-3 py-1 bg-gold/10 text-gold text-xs font-bold rounded-full">
                                 {creator.role.toUpperCase()}
                              </span>
                           </div>
                        </div>

                        {/* Follow Button - Only show if not viewing own profile */}
                        {backendUser && backendUser.id !== creator.id && (
                           <div className="flex items-center gap-2">
                              <button
                                 onClick={handleFollowToggle}
                                 disabled={followLoading}
                                 className={`px-8 py-3 rounded-full font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isFollowing
                                    ? 'bg-surface border border-borderSubtle text-ink hover:border-gold/50'
                                    : 'bg-gold text-white hover:bg-gold/90 shadow-md'
                                    }`}
                              >
                                 {followLoading ? 'Loading...' : (isFollowing ? 'Following' : 'Follow')}
                              </button>

                              {/* DM Button (Phase 9) */}
                              <button
                                 onClick={async () => {
                                    if (!accessToken || !backendUser) { connectWallet(); return; }
                                    setDmLoading(true);
                                    try {
                                       await findOrCreateThread(creator.id, accessToken);
                                       onNavigate('user-profile');
                                    } catch (err: any) {
                                       console.error('DM failed:', err);
                                       toast.error(err.message || 'Failed to open DM');
                                    } finally {
                                       setDmLoading(false);
                                    }
                                 }}
                                 disabled={dmLoading}
                                 className="px-4 py-3 rounded-full font-bold transition-all bg-surface border border-borderSubtle text-ink hover:border-gold/50 flex items-center gap-1.5 disabled:opacity-50"
                              >
                                 {dmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                 DM
                              </button>

                              {/* Tip Button (Phase 13) */}
                              <button
                                 onClick={() => {
                                    if (!accessToken || !backendUser) { connectWallet(); return; }
                                    setShowTipModal(true);
                                 }}
                                 className="px-4 py-3 rounded-full font-bold transition-all bg-surface border border-borderSubtle text-ink hover:border-gold/50 flex items-center gap-1.5"
                              >
                                 <Heart className="w-4 h-4" />
                                 Tip
                              </button>
                           </div>
                        )}

                        {/* Share Button */}
                        <div className="relative">
                           <button
                              onClick={handleShare}
                              className="px-6 py-3 rounded-full font-bold transition-all bg-surface border border-borderSubtle text-ink hover:border-blue-300 hover:text-blue-500 flex items-center gap-2"
                           >
                              <Share2 className="w-4 h-4" />
                              Share
                           </button>
                           {showSharePopup && (
                              <motion.div
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 className="absolute right-0 top-full mt-2 bg-canvas text-ink px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-borderSubtle whitespace-nowrap z-50"
                              >
                                 Link copied! ✓
                              </motion.div>
                           )}
                        </div>

                        {/* View Community button — show if creator has a community */}
                        {creator.community_slug && (
                           <button
                              onClick={() => onNavigate('community-page', creator.community_slug!)}
                              className="px-6 py-3 rounded-full font-bold transition-all bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20 flex items-center gap-2"
                           >
                              <Users className="w-4 h-4" />
                              View Community
                           </button>
                        )}
                     </div>

                     {/* Bio */}
                     {creator.bio && (
                        <div className="mb-4">
                           <p className="text-inkLight leading-relaxed">{creator.bio}</p>
                        </div>
                     )}

                     {/* Links */}
                     <div className="flex flex-wrap items-center gap-4">
                        {creator.website && (
                           <a
                              href={creator.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-ink hover:text-gold transition-colors"
                           >
                              <LinkIcon className="w-4 h-4" />
                              <span className="font-medium">{creator.website.replace('https://', '').replace('http://', '')}</span>
                           </a>
                        )}
                        {creator.twitter && (
                           <a
                              href={`https://twitter.com/${creator.twitter}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-ink hover:text-[#1DA1F2] transition-colors"
                           >
                              <Twitter className="w-4 h-4" />
                              <span className="font-medium">@{creator.twitter}</span>
                           </a>
                        )}
                        {creator.instagram && (
                           <a
                              href={`https://instagram.com/${creator.instagram}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-ink hover:text-[#E4405F] transition-colors"
                           >
                              <Instagram className="w-4 h-4" />
                              <span className="font-medium">@{creator.instagram}</span>
                           </a>
                        )}
                        {creator.youtube && (
                           <a
                              href={creator.youtube}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-ink hover:text-[#FF0000] transition-colors"
                           >
                              <Youtube className="w-4 h-4" />
                              <span className="font-medium">YouTube</span>
                           </a>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* Tabs & Content */}
            <div className="bg-canvas rounded-2xl border border-borderSubtle p-4 md:p-8">
               <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                  <div className="flex bg-surface p-1 rounded-2xl border border-borderSubtle w-full sm:w-auto">
                     <button
                        onClick={() => setActiveTab('shows')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'shows'
                           ? 'bg-canvas text-ink shadow-sm'
                           : 'text-inkLight hover:text-ink'
                           }`}
                     >
                        <Video className="w-4 h-4" />
                        Shows
                     </button>
                     <button
                        onClick={() => setActiveTab('merch')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'merch'
                           ? 'bg-canvas text-ink shadow-sm'
                           : 'text-inkLight hover:text-ink'
                           }`}
                     >
                        <ShoppingBag className="w-4 h-4" />
                        Merch
                     </button>
                  </div>
                  <div className="text-sm font-bold text-inkLight">
                     {activeTab === 'shows' ? `${shows.length} shows` : `${merch.length} items`}
                  </div>
               </div>

               {activeTab === 'shows' ? (
                  <>
                     {loadingShows ? (
                        <div className="text-center py-12">
                           <div className="animate-spin w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full mx-auto mb-4" />
                           <p className="text-inkLight">Loading shows...</p>
                        </div>
                     ) : shows.length === 0 ? (
                        <div className="text-center py-12">
                           <div className="text-6xl mb-4">🎬</div>
                           <h3 className="text-xl font-bold text-ink mb-2">No Shows Yet</h3>
                           <p className="text-inkLight">This creator hasn't published any shows yet.</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           {shows.map((show) => (
                              <div
                                 key={show.id}
                                 onClick={() => onNavigate('show-detail', show.slug)}
                                 className="group bg-canvas border border-borderSubtle rounded-2xl overflow-hidden hover:shadow-soft hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                              >
                                 {/* Thumbnail */}
                                 <div className="aspect-video bg-surface relative overflow-hidden">
                                    {show.thumbnail ? (
                                       <img
                                          src={show.thumbnail}
                                          alt={show.title}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                       />
                                    ) : (
                                       <div className="w-full h-full flex items-center justify-center text-4xl">
                                          🎬
                                       </div>
                                    )}

                                    {/* Recurring Badge */}
                                    {show.is_recurring && (
                                       <div className="absolute top-3 left-3 bg-gold text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
                                          RECURRING
                                       </div>
                                    )}
                                 </div>

                                 {/* Content */}
                                 <div className="p-4">
                                    <h3 className="font-bold text-ink text-lg mb-2 line-clamp-2 group-hover:text-gold transition-colors">
                                       {show.title}
                                    </h3>
                                    <p className="text-sm text-inkLight line-clamp-2 mb-4">
                                       {show.description}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-inkLight">
                                       <span className="flex items-center gap-1">
                                          <Heart className="w-3 h-3" /> {show.like_count}
                                       </span>
                                       <span className="flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3" /> {show.comment_count}
                                       </span>
                                       {show.is_recurring && show.day_of_week !== null && (
                                          <span className="ml-auto text-gold font-bold">
                                             {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][show.day_of_week]}
                                          </span>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </>
               ) : (
                  <>
                     {loadingMerch ? (
                        <div className="text-center py-12">
                           <div className="animate-spin w-8 h-8 border-4 border-gold/30 border-t-gold rounded-full mx-auto mb-4" />
                           <p className="text-inkLight">Loading merchandise...</p>
                        </div>
                     ) : merch.length === 0 ? (
                        <div className="text-center py-20 bg-surface/30 rounded-3xl border-2 border-dashed border-borderSubtle">
                           <ShoppingBag className="w-16 h-16 text-inkLight/20 mx-auto mb-4" />
                           <h3 className="text-xl font-bold text-ink mb-2">No Merchandise</h3>
                           <p className="text-inkLight">Stay tuned! This creator hasn't listed any merch yet.</p>
                        </div>
                     ) : (
                        <>
                        {/* Token Selector for Merch */}
                        <div className="flex justify-center gap-2 mb-6">
                           {(['USDCx', 'STX', 'sBTC'] as const).map(t => (
                              <button
                                 key={t}
                                 onClick={() => setMerchPayToken(t)}
                                 className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                                    merchPayToken === t
                                       ? 'bg-gold text-background shadow-md'
                                       : 'bg-surface border border-borderSubtle text-inkLight hover:border-gold/30'
                                 }`}
                              >
                                 Pay in {t}
                              </button>
                           ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                           {merch.map((item) => (
                              <div key={item.id} className="group bg-canvas border border-borderSubtle rounded-3xl overflow-hidden hover:shadow-xl transition-all duration-500">
                                 <div className="aspect-square bg-surface relative overflow-hidden">
                                    <img
                                       src={item.image || "https://picsum.photos/400/400"}
                                       alt={item.name}
                                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    {item.stock === 0 && (
                                       <div className="absolute inset-0 bg-canvas/80 flex items-center justify-center">
                                          <span className="px-6 py-2 bg-ink text-white font-bold rounded-full text-sm">SOLD OUT</span>
                                       </div>
                                    )}
                                 </div>
                                 <div className="p-6">
                                    <h3 className="font-bold text-ink text-xl mb-2 line-clamp-1">{item.name}</h3>
                                    <p className="text-sm text-inkLight mb-6 line-clamp-2 min-h-[2.5rem]">{item.description}</p>
                                    
                                    <div className="flex items-center justify-between pt-4 border-t border-borderSubtle">
                                       <div>
                                          <p className="text-xs font-bold text-inkLight tracking-wider uppercase">Price</p>
                                          <div className="flex items-baseline gap-1">
                                             <span className="text-2xl font-black text-ink">
                                                {merchPayToken === 'STX' ? Number(item.price_stx) : merchPayToken === 'sBTC' ? Number((parseFloat(String(item.price_usdcx)) * 0.000014)).toFixed(8).replace(/\.?0+$/, '') : Number(item.price_usdcx)}
                                             </span>
                                             <span className="text-xs font-bold text-inkLight">{merchPayToken}</span>
                                          </div>
                                       </div>
                                       <button
                                          onClick={() => handleBuyMerch(item)}
                                          disabled={item.stock === 0 || buyLoading[item.id]}
                                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                             item.stock > 0 
                                             ? 'bg-gold-gradient text-white shadow-md shadow-gold/10 hover:shadow-gold/30 hover:-translate-y-0.5' 
                                             : 'bg-surface text-inkLight/50 cursor-not-allowed'
                                          }`}
                                       >
                                          {buyLoading[item.id] ? (
                                             <Loader2 className="w-5 h-5 animate-spin" />
                                          ) : (
                                             <CreditCard className="w-5 h-5" />
                                          )}
                                          Buy Now
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                        </>
                     )}
                  </>
               )}
            </div>

         </div>

         {/* Followers/Following Modal */}
         {showFollowersModal && creator && (
            <FollowersList
               userId={creator.id}
               username={creator.username}
               initialTab={followersModalTab}
               followerCount={creator.follower_count || 0}
               followingCount={creator.following_count || 0}
               onClose={() => setShowFollowersModal(false)}
               onNavigate={onNavigate}
            />
         )}

         {/* Tip Modal (Phase 13) */}
         {showTipModal && creator && (
            <TipModal
               creatorId={creator.id}
               onClose={() => setShowTipModal(false)}
            />
         )}
      </div>
   );
};
