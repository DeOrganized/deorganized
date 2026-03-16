import React, { useState, useEffect } from 'react';
import { Play, Calendar, Filter, Heart, Bell, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { searchShows, Show, fetchTags, Tag, getImageUrl } from '../lib/api';
import { SearchBar } from './SearchBar';


interface ShowsDiscoveryProps {
   onNavigate?: (page: string, id?: string | number) => void;
}

export const ShowsDiscovery: React.FC<ShowsDiscoveryProps> = ({ onNavigate }) => {
   const [hoveredShow, setHoveredShow] = useState<number | null>(null);
   const [shows, setShows] = useState<Show[]>([]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
   const [tags, setTags] = useState<Tag[]>([]);
   const [loadingTags, setLoadingTags] = useState(true);

   // Fetch available tags on mount
   useEffect(() => {
      const loadTags = async () => {
         try {
            const data = await fetchTags();
            setTags(data);
         } catch (error) {
            console.error('Failed to load tags:', error);
         } finally {
            setLoadingTags(false);
         }
      };
      loadTags();
   }, []);

   useEffect(() => {
      const loadShows = async () => {
         try {
            setLoading(true);
            // Use searchShows for everything since it handles empty query string
            const data = await searchShows(searchQuery, selectedTagIds);
            setShows(data);
         } catch (error) {
            console.error('Failed to load shows:', error);
         } finally {
            setLoading(false);
         }
      };

      // Debounce search
      const timer = setTimeout(loadShows, 300);
      return () => clearTimeout(timer);
   }, [searchQuery, selectedTagIds]);

   const handleShowClick = (slug: string) => {
      if (onNavigate) {
         onNavigate('show-detail', slug);
      }
   };

   // Find featured show (first one or specific logic)
   const featuredShow = shows.length > 0 ? shows[0] : null;


   return (
      <div className="min-h-screen pt-24 pb-20 container max-w-[1280px] mx-auto px-6">

         {/* Featured / Hero Show */}
         {/* Only show featured if no search/filter active to avoid confusion */}
         {featuredShow && !searchQuery && selectedTagIds.length === 0 && (
            <section className="mb-20">
               <div className="relative rounded-3xl overflow-hidden bg-canvas border border-borderSubtle shadow-soft group">
                  <div className="absolute inset-0 bg-gradient-to-r from-canvas via-canvas/80 to-transparent z-10" />
                  <div className="absolute inset-0 z-0">
                     <img src={featuredShow.thumbnail || "https://picsum.photos/1600/900?grayscale"} alt="Featured" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-1000" />
                  </div>

                  <div className="relative z-20 grid lg:grid-cols-2 gap-12 p-8 md:p-12 items-center">
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <span className="flex items-center gap-1.5 bg-gold-50 text-gold border border-gold-100 px-3 py-1 rounded-full text-xs font-bold">
                              <Radio className="w-3 h-3" /> {featuredShow.status.toUpperCase()}
                           </span>
                           <span className="text-inkLight text-sm font-semibold tracking-wide">{featuredShow.like_count} Likes</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight">
                           {featuredShow.title}
                        </h1>

                        <p className="text-lg text-inkLight font-medium max-w-lg line-clamp-3">
                           {featuredShow.description}
                        </p>

                        <div className="flex items-center gap-4">
                           <div className="flex items-center gap-3">
                              <img src={getImageUrl(featuredShow.creator.profile_picture) || "https://picsum.photos/100/100"} alt="Host" className="w-10 h-10 rounded-full border-2 border-borderSubtle shadow-sm" />
                              <div className="text-sm">
                                 <p className="text-inkLight">Hosted by</p>
                                 <p className="font-bold text-ink">{featuredShow.creator.username}</p>
                              </div>
                           </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-4">
                           <button
                              onClick={() => handleShowClick(featuredShow.slug)}
                              className="bg-gold-gradient text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-1 transition-all flex items-center gap-2"
                           >
                              <Play className="w-5 h-5 fill-current" />
                              View Show
                           </button>
                           <button className="bg-canvas border border-borderSubtle text-ink font-bold px-6 py-4 rounded-full hover:bg-surface hover:border-gold/30 transition-all flex items-center gap-2 shadow-sm">
                              <Bell className="w-5 h-5" />
                              Subscribe
                           </button>
                        </div>
                     </div>

                     {/* Hero Preview */}
                     <div
                        onClick={() => handleShowClick(featuredShow.slug)}
                        className="hidden lg:block relative aspect-video rounded-2xl overflow-hidden shadow-2xl border border-borderSubtle cursor-pointer"
                     >
                        <img src={featuredShow.thumbnail || "https://picsum.photos/800/450"} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                           <div className="w-20 h-20 bg-surface/20 backdrop-blur-md rounded-full flex items-center justify-center border border-borderSubtle/50 shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-8 h-8 text-white fill-white ml-1" />
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </section>
         )}

         {/* Filters & Search */}
         <section className="mb-12 space-y-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
               <div className="w-full md:w-96">
                  <SearchBar
                     onSearch={setSearchQuery}
                     placeholder="Search shows, hosts, tags..."
                  />
               </div>

               <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                  <div className="flex gap-2">
                     <button
                        onClick={() => setSelectedTagIds([])}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedTagIds.length === 0
                           ? 'bg-gold text-white shadow-md'
                           : 'bg-transparent border border-borderSubtle text-inkLight hover:bg-gold hover:text-white hover:border-gold'
                           }`}
                     >
                        All Shows
                     </button>
                     {loadingTags ? (
                        <div className="px-5 py-2.5 text-sm text-inkLight">Loading tags...</div>
                     ) : (
                        tags.slice(0, 10).map(tag => (
                           <button
                              key={tag.id}
                              onClick={() => {
                                 if (selectedTagIds.includes(tag.id)) {
                                    setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                                 } else {
                                    setSelectedTagIds([...selectedTagIds, tag.id]);
                                 }
                              }}
                              className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedTagIds.includes(tag.id)
                                 ? 'bg-gold text-white shadow-md'
                                 : 'bg-transparent border border-borderSubtle text-inkLight hover:bg-gold hover:text-white hover:border-gold'
                                 }`}
                           >
                              {tag.name}
                           </button>
                        ))
                     )}
                  </div>
               </div>
            </div>


         </section>

         {/* Shows Grid */}
         {loading ? (
            <div className="text-center py-20">
               <p className="text-inkLight">Loading shows...</p>
            </div>
         ) : shows.length > 0 ? (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {shows.map((show) => (
                  <motion.div
                     key={show.id}
                     onClick={() => handleShowClick(show.slug)}
                     initial={{ opacity: 0, y: 30 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     viewport={{ once: true }}
                     onMouseEnter={() => setHoveredShow(show.id)}
                     onMouseLeave={() => setHoveredShow(null)}
                     className="group bg-canvas border border-borderSubtle rounded-3xl overflow-hidden hover:shadow-soft transition-all duration-300 flex flex-col h-full cursor-pointer"
                  >
                     {/* Thumbnail */}
                     <div className="relative aspect-video overflow-hidden">
                        <img
                           src={show.thumbnail || "https://picsum.photos/800/450"}
                           alt={show.title}
                           className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />

                        {/* Status Badge */}
                        <div className="absolute top-4 left-4">
                           <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                              {show.status}
                           </span>
                        </div>

                        {/* Overlay Play Button */}
                        <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-300 ${hoveredShow === show.id ? 'opacity-100' : 'opacity-0'}`}>
                           <div className="w-12 h-12 bg-canvas rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                              <Play className="w-5 h-5 text-ink fill-ink ml-0.5" />
                           </div>
                        </div>
                     </div>

                     {/* Content */}
                     <div className="p-6 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex flex-wrap gap-2">
                              <span className="text-xs font-bold text-gold uppercase tracking-wider border border-gold/20 px-2 py-0.5 rounded-full bg-gold/5">Show</span>
                              {show.tags && show.tags.slice(0, 2).map(tag => (
                                 <span key={tag.id} className="text-xs font-medium text-inkLight bg-surface px-2 py-0.5 rounded-full border border-borderSubtle">
                                    {tag.name}
                                 </span>
                              ))}
                           </div>
                           <button className="text-inkLight hover:text-red-500 transition-colors">
                              <Heart className="w-5 h-5" />
                           </button>
                        </div>

                        <h3 className="text-xl font-bold text-ink mb-2 line-clamp-1 group-hover:text-gold transition-colors">{show.title}</h3>
                        <p className="text-sm text-inkLight font-medium line-clamp-2 mb-6 flex-1">
                           {show.description}
                        </p>

                        <div className="border-t border-borderSubtle pt-4 mt-auto">
                           <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2">
                                 <img src={getImageUrl(show.creator.profile_picture) || "https://picsum.photos/100/100"} className="w-8 h-8 rounded-full border border-borderSubtle" />
                                 <span className="text-sm font-semibold text-ink">{show.creator.username}</span>
                              </div>
                           </div>

                           <div className="flex items-center justify-between text-xs font-medium text-inkLight">
                              <div className="flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-borderSubtle">
                                 <Calendar className="w-3 h-3 text-gold" />
                                 {show.schedule_display || 'On Demand'}
                              </div>
                              <div className="flex items-center gap-1.5">
                                 <Heart className="w-3 h-3" />
                                 {show.like_count}
                              </div>
                           </div>
                        </div>
                     </div>
                  </motion.div>
               ))}
            </section>
         ) : (
            <div className="text-center py-20">
               <div className="text-6xl mb-4">🔍</div>
               <h2 className="text-2xl font-bold text-ink mb-2">No shows found</h2>
               <p className="text-inkLight">Try adjusting your search or filters.</p>
            </div>
         )}
      </div>
   );
};


