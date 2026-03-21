import React, { useState, useEffect } from 'react';
import {
   User, Settings, Clock, Heart, Shield, Zap,
   LogOut, Play, MoreHorizontal, MessageSquare,
   ThumbsUp, ExternalLink, CreditCard, Award, Loader2,
   UserPlus, Share2, Bell, Crown, Calendar,
   Wallet, Coins, Copy, Check, ChevronDown, ChevronUp
} from 'lucide-react';
import { request } from '@stacks/connect';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/AuthContext';
import { FollowersList } from './FollowersList';
import { MessagingInbox } from './MessagingInbox';
import {
   fetchUserProfile,
   fetchUserFollowing,
   getUserLikedShows,
   fetchNotifications,
   markNotificationRead,
   fetchShowByPk,
   getDAPStatus,
   registerDAP,
   getDAPBalance,
   getStacksWalletBalances,
   getMyCommunities,
   UserProfile,
   Creator,
   Show,
   Notification,
   DAPStatus,
   DAPUser,
   DAPBalance,
   StacksWalletBalances,
   MembershipWithCommunity,
} from '../lib/api';

interface UserDashboardProps {
   onNavigate: (page: string, id?: string | number) => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onNavigate }) => {
   const { backendUser, accessToken, logout } = useAuth();
   const [activeTab, setActiveTab] = useState<'history' | 'liked' | 'activity' | 'messages'>('liked');

   // Followers modal
   const [showFollowersModal, setShowFollowersModal] = useState(false);
   const [followersModalTab, setFollowersModalTab] = useState<'followers' | 'following'>('followers');

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

   // Wallet & Credits state
   const [dapStatus, setDapStatus] = useState<DAPStatus | null>(null);
   const [dapUser, setDapUser] = useState<DAPUser | null>(null);
   const [dapBalance, setDapBalance] = useState<DAPBalance | null>(null);
   const [walletBals, setWalletBals] = useState<StacksWalletBalances | null>(null);
   const [isLoadingWallet, setIsLoadingWallet] = useState(true);
   const [isDAPRegistered, setIsDAPRegistered] = useState(false);
   const [isRegisteringDAP, setIsRegisteringDAP] = useState(false);
   const [copiedAddress, setCopiedAddress] = useState(false);
   const [copiedMemo, setCopiedMemo] = useState(false);
   const [copiedDeposit, setCopiedDeposit] = useState(false);
   const [stxAmount, setStxAmount] = useState('1');
   const [depositPending, setDepositPending] = useState(false);
   const [advancedOpen, setAdvancedOpen] = useState(false);

   // My communities
   const [myCommunities, setMyCommunities] = useState<MembershipWithCommunity[]>([]);

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

   // Fetch my communities
   useEffect(() => {
      if (!accessToken) return;
      getMyCommunities(accessToken).then(setMyCommunities).catch(() => {});
   }, [accessToken]);

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

   // Load wallet & DAP data
   useEffect(() => {
      const loadWalletData = async () => {
         if (!accessToken || !backendUser?.stacks_address) {
            setIsLoadingWallet(false);
            return;
         }
         setIsLoadingWallet(true);
         const addr = backendUser.stacks_address;
         try {
            const [status, bals] = await Promise.all([
               getDAPStatus(accessToken),
               getStacksWalletBalances(addr).catch(() => null),
            ]);
            setDapStatus(status);
            setWalletBals(bals);

            // registerDAP is idempotent — creates account if new, returns existing if not
            const user = await registerDAP(accessToken, addr);
            setDapUser(user);
            setIsDAPRegistered(true);

            const bal = await getDAPBalance(accessToken, addr).catch(() => null);
            setDapBalance(bal);
         } catch (err) {
            console.error('Failed to load wallet data:', err);
            setIsDAPRegistered(false);
         } finally {
            setIsLoadingWallet(false);
         }
      };
      loadWalletData();
   }, [accessToken, backendUser?.stacks_address]);

   const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
      navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
   };

   const handleBuyCredits = async () => {
      if (!dapStatus || !dapUser) return;
      const stx = parseFloat(stxAmount);
      if (!stx || stx <= 0) return;
      const microStx = String(Math.round(stx * 1_000_000));
      try {
         await request('stx_transferStx', {
            recipient: dapStatus.deposit_address,
            amount: microStx,
            memo: dapUser.memo_code,
         });
         setDepositPending(true);
      } catch {
         // user cancelled or wallet rejected — do nothing
      }
   };

   const handleRegisterDAP = async () => {
      if (!accessToken || !backendUser?.stacks_address) return;
      setIsRegisteringDAP(true);
      try {
         const user = await registerDAP(accessToken, backendUser.stacks_address);
         setDapUser(user);
         setIsDAPRegistered(true);
         const bal = await getDAPBalance(accessToken, backendUser.stacks_address).catch(() => null);
         setDapBalance(bal);
      } catch (err) {
         console.error('DAP registration failed:', err);
      } finally {
         setIsRegisteringDAP(false);
      }
   };

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
      <div className="min-h-screen pt-24 pb-20 container max-w-[1024px] mx-auto px-4 md:px-6 space-y-8">

         {/* Header */}
         <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
            <div>
               <h1 className="text-2xl md:text-4xl font-bold text-ink mb-1 md:mb-2">My Dashboard</h1>
               <p className="text-inkLight font-medium text-sm md:text-base">
                  Welcome back, {backendUser.username || 'User'}.
               </p>
            </div>
            <button
               onClick={logout}
               className="flex items-center gap-2 text-sm font-bold text-ink hover:text-red-500 transition-colors self-start sm:self-auto"
            >
               <LogOut className="w-4 h-4" /> Sign Out
            </button>
         </div>

         {/* ── MY COMMUNITIES ──────────────────────────────────────────── */}
         <div className="bg-canvas border border-borderSubtle rounded-3xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                     <Users className="w-4 h-4 text-gold" />
                  </div>
                  <h3 className="text-base font-bold text-ink">My Communities</h3>
               </div>
               <button
                  onClick={() => onNavigate('communities')}
                  className="text-sm font-bold text-inkLight hover:text-gold transition-colors"
               >
                  Browse All →
               </button>
            </div>
            {myCommunities.length === 0 ? (
               <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <p className="text-sm text-inkLight">You haven't joined any communities yet.</p>
                  <button
                     onClick={() => onNavigate('communities')}
                     className="text-sm font-bold text-gold hover:text-gold/80 transition-colors"
                  >
                     Explore Communities →
                  </button>
               </div>
            ) : (
               <div className="flex flex-wrap gap-3">
                  {myCommunities.map(({ community, role }) => (
                     <button
                        key={community.id}
                        onClick={() => onNavigate('community-page', community.slug)}
                        className="flex items-center gap-2.5 px-3 py-2 bg-surface rounded-xl border border-borderSubtle hover:border-gold/40 transition-colors"
                     >
                        <div className="w-7 h-7 rounded-lg bg-canvas overflow-hidden shrink-0 flex items-center justify-center border border-borderSubtle">
                           {community.avatar ? (
                              <img src={community.avatar} alt={community.name} className="w-full h-full object-cover" />
                           ) : (
                              <span className="text-xs font-black text-inkLight">{community.name[0]?.toUpperCase()}</span>
                           )}
                        </div>
                        <span className="text-sm font-bold text-ink">{community.name}</span>
                        {role === 'founder' && <Crown className="w-3 h-3 text-gold" />}
                     </button>
                  ))}
               </div>
            )}
         </div>

         {/* ── WALLET & CREDITS ────────────────────────────────────────── */}
         {backendUser.stacks_address && (
            <div className="bg-canvas border border-gold/20 rounded-3xl p-6 shadow-soft relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-gold rounded-full opacity-[0.04] blur-[80px] pointer-events-none" />

               <div className="relative z-10">
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-5">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
                           <Wallet className="w-4 h-4 text-gold" />
                        </div>
                        <h3 className="text-base font-bold text-ink">Wallet & Credits</h3>
                     </div>
                     <button
                        onClick={() => copyToClipboard(backendUser.stacks_address, setCopiedAddress)}
                        className="flex items-center gap-1.5 bg-surface border border-borderSubtle px-3 py-1.5 rounded-full hover:border-gold/40 hover:text-gold transition-colors cursor-pointer"
                        title={backendUser.stacks_address}
                     >
                        {copiedAddress ? (
                           <>
                              <Check className="w-3 h-3 text-green-500" />
                              <span className="text-xs font-mono text-green-500">Copied!</span>
                           </>
                        ) : (
                           <>
                              <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                              <span className="text-xs font-mono text-inkLight">
                                 {backendUser.stacks_address.slice(0, 6)}…{backendUser.stacks_address.slice(-4)}
                              </span>
                              <Copy className="w-3 h-3 text-inkLight/50" />
                           </>
                        )}
                     </button>
                  </div>

                  {isLoadingWallet ? (
                     <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-gold animate-spin" />
                     </div>
                  ) : (
                     <div className="space-y-5">
                        {/* Token balance row */}
                        <div className="grid grid-cols-3 gap-3">
                           <div className="bg-surface border border-borderSubtle rounded-xl p-3">
                              <p className="text-[10px] font-bold text-inkLight uppercase tracking-wider mb-1">STX</p>
                              <p className="text-sm font-bold text-gold">{walletBals ? walletBals.stx : '—'}</p>
                              <p className="text-[10px] text-inkLight">Spendable</p>
                           </div>
                           <div className="bg-surface border border-borderSubtle rounded-xl p-3">
                              <p className="text-[10px] font-bold text-inkLight uppercase tracking-wider mb-1">sBTC</p>
                              <p className="text-sm font-bold text-gold truncate">{walletBals ? walletBals.sbtc : '—'}</p>
                              <p className="text-[10px] text-inkLight">Bitcoin</p>
                           </div>
                           <div className="bg-surface border border-borderSubtle rounded-xl p-3">
                              <p className="text-[10px] font-bold text-inkLight uppercase tracking-wider mb-1">USDCx</p>
                              <p className="text-sm font-bold text-gold">{walletBals ? `$${walletBals.usdcx}` : '—'}</p>
                              <p className="text-[10px] text-inkLight">Stablecoin</p>
                           </div>
                        </div>

                        {/* DAP credit balance + buy */}
                        {isDAPRegistered && dapUser && dapStatus ? (
                           <>
                              <div className="flex items-center justify-between bg-gold/5 border border-gold/20 rounded-xl px-4 py-3">
                                 <a href="/daps" className="group">
                                    <div className="flex items-center gap-2 mb-0.5">
                                       <Coins className="w-4 h-4 text-gold" />
                                       <span className="text-xs font-semibold text-inkLight uppercase tracking-wider group-hover:text-gold transition-colors">DAP Credits</span>
                                    </div>
                                    <span className="text-3xl font-bold text-gold">
                                       {dapBalance ? Number(dapBalance.balance).toLocaleString() : '—'}
                                    </span>
                                 </a>
                                 {depositPending ? (
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gold bg-gold/10 border border-gold/20 px-3 py-2 rounded-xl">
                                       <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deposit pending…
                                    </div>
                                 ) : (
                                    <div className="flex flex-col items-end gap-2">
                                       <div className="flex items-center gap-2">
                                          <input
                                             type="number"
                                             min="1"
                                             step="1"
                                             value={stxAmount}
                                             onChange={e => setStxAmount(e.target.value)}
                                             className="w-16 text-sm font-bold text-center bg-surface border border-borderSubtle rounded-lg px-2 py-1.5 text-ink focus:outline-none focus:border-gold"
                                          />
                                          <span className="text-xs text-inkLight font-medium">STX</span>
                                          <button
                                             onClick={handleBuyCredits}
                                             className="bg-gold-gradient text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md shadow-gold/20 hover:shadow-gold/40 transition-all hover:-translate-y-0.5"
                                          >
                                             Buy Credits
                                          </button>
                                       </div>
                                       <p className="text-[10px] text-inkLight">
                                          = {(parseFloat(stxAmount) * 100 || 0).toLocaleString()} credits
                                       </p>
                                       <a href="/daps" className="text-[10px] text-inkLight hover:text-gold transition-colors">What are DAP credits?</a>
                                    </div>
                                 )}
                              </div>

                              {/* Advanced: manual deposit (for funding a different wallet) */}
                              <div className="border border-borderSubtle rounded-xl overflow-hidden">
                                 <button
                                    onClick={() => setAdvancedOpen(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-inkLight hover:text-ink transition-colors"
                                 >
                                    <span>Advanced — Fund a different wallet</span>
                                    {advancedOpen
                                       ? <ChevronUp className="w-4 h-4" />
                                       : <ChevronDown className="w-4 h-4" />}
                                 </button>
                                 {advancedOpen && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-borderSubtle">
                                       <p className="text-xs text-inkLight leading-relaxed pt-3">
                                          Send STX from any wallet to the deposit address below.
                                          Include your memo code so the system knows to credit your account.
                                          <span className="text-gold font-semibold"> 100 credits per STX</span>, detected within 30 seconds.
                                       </p>
                                       <div>
                                          <p className="text-[10px] font-bold text-inkLight uppercase tracking-wider mb-1.5">Deposit Address</p>
                                          <div className="flex items-center gap-2 bg-surface border border-borderSubtle rounded-lg px-3 py-2">
                                             <span className="text-xs font-mono text-ink flex-1 truncate">{dapStatus.deposit_address}</span>
                                             <button
                                                onClick={() => copyToClipboard(dapStatus.deposit_address, setCopiedDeposit)}
                                                className="flex-shrink-0 text-inkLight hover:text-gold transition-colors"
                                                aria-label="Copy deposit address"
                                             >
                                                {copiedDeposit ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                             </button>
                                          </div>
                                       </div>
                                       <div>
                                          <p className="text-[10px] font-bold text-inkLight uppercase tracking-wider mb-1.5">
                                             Memo Code <span className="text-red-500 font-normal normal-case">(required)</span>
                                          </p>
                                          <div className="flex items-center gap-2 bg-surface border border-borderSubtle rounded-lg px-3 py-2">
                                             <span className="text-xs font-mono font-bold text-gold flex-1">{dapUser.memo_code}</span>
                                             <button
                                                onClick={() => copyToClipboard(dapUser.memo_code, setCopiedMemo)}
                                                className="flex-shrink-0 text-inkLight hover:text-gold transition-colors"
                                                aria-label="Copy memo code"
                                             >
                                                {copiedMemo ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                             </button>
                                          </div>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </>
                        ) : !isDAPRegistered ? (
                           <div className="border border-borderSubtle rounded-xl p-4 text-center space-y-3">
                              <p className="text-xs text-inkLight">Register with the DAP service to get your credit account and start buying credits.</p>
                              <button
                                 onClick={handleRegisterDAP}
                                 disabled={isRegisteringDAP}
                                 className="bg-gold-gradient text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-md shadow-gold/20 hover:shadow-gold/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                              >
                                 {isRegisteringDAP && <Loader2 className="w-4 h-4 animate-spin" />}
                                 Register for Credits
                              </button>
                           </div>
                        ) : null}
                     </div>
                  )}
               </div>
            </div>
         )}

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

                        <div className="flex gap-6 mb-6 w-full justify-center">
                           <button
                              onClick={() => { setFollowersModalTab('following'); setShowFollowersModal(true); }}
                              className="text-center hover:text-gold transition-colors cursor-pointer"
                           >
                              <p className="text-2xl font-bold text-ink">{userProfile?.following_count || 0}</p>
                              <p className="text-xs text-inkLight font-medium">Following</p>
                           </button>
                           <button
                              onClick={() => { setFollowersModalTab('followers'); setShowFollowersModal(true); }}
                              className="text-center hover:text-gold transition-colors cursor-pointer"
                           >
                              <p className="text-2xl font-bold text-ink">{userProfile?.follower_count || 0}</p>
                              <p className="text-xs text-inkLight font-medium">Followers</p>
                           </button>
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

                        {/* Admin Dashboard Link (staff only) */}
                        {backendUser.is_staff && (
                           <button
                              onClick={() => onNavigate('admin')}
                              className="mt-3 w-full flex items-center justify-center gap-2 bg-gold/10 border border-gold/30 text-gold text-sm font-bold py-2.5 rounded-xl hover:bg-gold/20 transition-colors"
                           >
                              <Shield className="w-4 h-4" /> Admin Dashboard
                           </button>
                        )}
                     </div>
                  )}
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
                  <div className="flex items-center gap-3 md:gap-6 border-b border-borderSubtle pb-4 mb-6 overflow-x-auto no-scrollbar">
                     {[
                        { id: 'liked', label: 'Liked Shows', icon: Heart },
                        { id: 'history', label: 'Watch History', icon: Clock },
                        { id: 'activity', label: 'Activity Feed', icon: Zap },
                        { id: 'messages', label: 'Messages', icon: MessageSquare },
                     ].map((tab) => (
                        <button
                           key={tab.id}
                           onClick={() => setActiveTab(tab.id as any)}
                           className={`flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-bold pb-4 -mb-8 transition-all relative whitespace-nowrap shrink-0 ${activeTab === tab.id
                              ? 'text-ink'
                              : 'text-inkLight hover:text-ink'
                              }`}
                        >
                           <tab.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${activeTab === tab.id ? 'text-gold' : ''}`} />
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
                                          case 'guest_request': return <UserPlus className="w-4 h-4 text-purple-500" />;
                                          case 'guest_accepted': return <ThumbsUp className="w-4 h-4 text-green-500" />;
                                          case 'guest_declined': return <ExternalLink className="w-4 h-4 text-red-500" />;
                                          case 'co_host_added': return <Crown className="w-4 h-4 text-gold" />;
                                          case 'show_reminder': return <Calendar className="w-4 h-4 text-gold" />;
                                          case 'show_cancelled': return <Bell className="w-4 h-4 text-red-500" />;
                                          default: return <Zap className="w-4 h-4 text-gold" />;
                                       }
                                    };
                                    const getColor = () => {
                                       switch (item.notification_type) {
                                          case 'like': return 'bg-red-500/10';
                                          case 'comment': return 'bg-blue-500/10';
                                          case 'follow': return 'bg-green-500/10';
                                          case 'share': return 'bg-purple-500/10';
                                          case 'guest_request': return 'bg-purple-500/10';
                                          case 'guest_accepted': return 'bg-green-500/10';
                                          case 'guest_declined': return 'bg-red-500/10';
                                          case 'co_host_added': return 'bg-gold/10';
                                          case 'show_reminder': return 'bg-gold/10';
                                          case 'show_cancelled': return 'bg-red-500/10';
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
                                          onClick={async () => {
                                             // Mark as read
                                             if (!item.is_read && accessToken) {
                                                try {
                                                   await markNotificationRead(item.id, accessToken);
                                                } catch (e) { console.error(e); }
                                             }
                                             // Route based on notification type
                                             if (item.notification_type === 'follow' && typeof item.actor === 'object') {
                                                onNavigate('creator-detail', item.actor.id);
                                             } else if (item.notification_type === 'guest_request' && typeof item.actor === 'object') {
                                                onNavigate('creator-detail', item.actor.id);
                                             } else if (item.notification_type === 'guest_declined' && typeof item.actor === 'object') {
                                                onNavigate('creator-detail', item.actor.id);
                                             } else if (['guest_accepted', 'co_host_added', 'show_reminder', 'show_cancelled'].includes(item.notification_type)) {
                                                if (item.show_slug) {
                                                   onNavigate('show-detail', item.show_slug);
                                                } else if (item.object_id) {
                                                   try {
                                                      const show = await fetchShowByPk(item.object_id);
                                                      if (show) onNavigate('show-detail', show.slug);
                                                   } catch { /* ignore */ }
                                                }
                                             } else if (item.notification_type === 'like' || item.notification_type === 'comment') {
                                                if (item.content_type_name === 'post') {
                                                   onNavigate('community');
                                                } else if (item.content_type_name === 'event' && item.object_id) {
                                                   onNavigate('event-detail', item.object_id);
                                                } else if (item.show_slug) {
                                                   onNavigate('show-detail', item.show_slug);
                                                } else if (item.object_id) {
                                                   try {
                                                      const show = await fetchShowByPk(item.object_id);
                                                      if (show) onNavigate('show-detail', show.slug);
                                                   } catch { /* ignore */ }
                                                }
                                             }
                                          }}
                                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gold/5 ${!item.is_read ? 'bg-gold/5 border border-gold/20' : 'bg-surface border border-borderSubtle'}`}
                                       >
                                          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${getColor()}`}>
                                             {getIcon()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <p className="text-sm text-ink">
                                                <span className="font-bold">{typeof item.actor === 'object' ? item.actor.username : 'Someone'}</span>
                                                {' '}{item.notification_type === 'like' ? 'liked your' : item.notification_type === 'comment' ? 'commented on your' : item.notification_type === 'follow' ? 'started following you' : item.notification_type === 'co_host_added' ? 'added you as co-host on' : item.notification_type === 'guest_request' ? 'wants to be on your show' : item.notification_type === 'guest_accepted' ? 'accepted your guest request' : item.notification_type === 'guest_declined' ? 'declined your guest request' : item.notification_type === 'show_reminder' ? 'Show starting soon:' : item.notification_type === 'show_cancelled' ? 'Show cancelled:' : 'interacted with your'}
                                                {item.notification_type !== 'follow' && (item.show_title || item.show_slug) && (
                                                   <span className="font-semibold text-gold"> {item.show_title || 'show'}</span>
                                                )}
                                                {item.notification_type !== 'follow' && item.content_type_name === 'post' && (
                                                   <span className="font-semibold text-gold"> post</span>
                                                )}
                                                {item.notification_type !== 'follow' && item.content_type_name === 'event' && (
                                                   <span className="font-semibold text-gold"> event</span>
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

                     {activeTab === 'messages' && (
                        <div className="mt-2">
                           <MessagingInbox />
                        </div>
                     )}

                  </div>
               </section>

            </div>

            {/* Followers/Following Modal */}
            {showFollowersModal && userProfile && (
               <FollowersList
                  userId={userProfile.id}
                  username={userProfile.username}
                  initialTab={followersModalTab}
                  followerCount={userProfile.follower_count || 0}
                  followingCount={userProfile.following_count || 0}
                  onClose={() => setShowFollowersModal(false)}
                  onNavigate={onNavigate}
               />
            )}
         </div>
      </div>
   );
};
