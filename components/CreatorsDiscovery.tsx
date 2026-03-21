import React, { useState, useEffect } from 'react';
import { Search, Star, TrendingUp, Users, CheckCircle, Plus, Video } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchCreators, fetchCreatorShows, Creator, Show } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

interface CreatorsDiscoveryProps {
  onNavigate?: (page: string, id?: string | number) => void;
}

const categories = ["Top Rated", "Rising Stars", "Analysts", "Educators", "Entertainers", "Developers"];

export const CreatorsDiscovery: React.FC<CreatorsDiscoveryProps> = ({ onNavigate }) => {
  const { backendUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Top Rated");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [creatorShows, setCreatorShows] = useState<Record<number, Show[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCreators = async () => {
      try {
        const data = await fetchCreators();
        setCreators(data);

        // Fetch recent shows for each creator
        const showsMap: Record<number, Show[]> = {};
        await Promise.all(
          data.slice(0, 12).map(async (creator) => {
            try {
              const shows = await fetchCreatorShows(creator.id, undefined, 'published');
              showsMap[creator.id] = shows.slice(0, 3); // Top 3 shows
            } catch (error) {
              console.error(`Failed to load shows for creator ${creator.id}:`, error);
              showsMap[creator.id] = [];
            }
          })
        );
        setCreatorShows(showsMap);
      } catch (error) {
        console.error('Failed to load creators:', error);
      } finally {
        setLoading(false);
      }
    };
    loadCreators();
  }, []);

  const handleCreatorClick = (creator: Creator) => {
    if (onNavigate) onNavigate('creator-detail', creator.username);
  };

  if (loading) {
    return <div className="min-h-screen pt-24 flex items-center justify-center"><p className="text-inkLight">Loading creators...</p></div>;
  }

  return (
    <div className="min-h-screen pt-24 pb-20 container max-w-[1280px] mx-auto px-6">

      {/* Communities bridge banner */}
      <div className="mb-8 flex items-center justify-between bg-surface border border-borderSubtle rounded-2xl px-5 py-3.5">
        <div className="flex items-center gap-2 text-sm text-inkLight">
          <Users className="w-4 h-4 text-gold" />
          <span>Looking for communities? Find groups built around your favourite creators.</span>
        </div>
        <button
          onClick={() => onNavigate?.('communities')}
          className="text-sm font-bold text-gold hover:text-gold/80 transition-colors whitespace-nowrap ml-4"
        >
          Explore Communities →
        </button>
      </div>

      {/* Hero Call to Action */}
      <section className="mb-16 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/5 border border-gold/20 mb-6"
        >
          <Star className="w-4 h-4 text-gold fill-gold" />
          <span className="text-gold font-bold text-sm">Join {creators.length}+ Verified Creators</span>
        </motion.div>

        <h1 className="text-5xl md:text-6xl font-bold text-ink mb-6 tracking-tight">
          Find Your <span className="text-gold">Signal</span>. <br />
          Follow the Best.
        </h1>
        <p className="text-xl text-inkLight font-medium mb-8 leading-relaxed max-w-2xl mx-auto">
          Discover the voices shaping the industry. From technical analysis to cultural commentary, find the creators that match your vibe.
        </p>

        <div className="flex items-center justify-center gap-4">
          <button className="bg-gold text-white font-bold px-8 py-4 rounded-full shadow-lg hover:bg-gold/90 transition-colors">
            Start Exploring
          </button>
          <button
            onClick={() => {
              if (!backendUser) {
                // Not logged in - go to edit-profile
                if (onNavigate) onNavigate('edit-profile');
              } else if (backendUser.role === 'creator') {
                // Already a creator - go to dashboard
                if (onNavigate) onNavigate('dashboard');
              } else {
                // Logged in but not a creator - go to edit profile to become one
                if (onNavigate) onNavigate('edit-profile');
              }
            }}
            className="bg-canvas border border-borderSubtle text-ink font-bold px-8 py-4 rounded-full hover:bg-surface hover:border-gold/30 transition-all shadow-sm"
          >
            {backendUser?.role === 'creator' ? 'Go to Dashboard' : 'Apply as Creator'}
          </button>
        </div>
      </section>

      {/* Filters */}
      <section className="mb-12 sticky top-24 z-30 bg-canvas/95 backdrop-blur-sm py-4 -mx-4 px-4 border-b border-borderSubtle/50 flex justify-center">
        <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inkLight" />
            <input
              type="text"
              placeholder="Find creators..."
              className="w-full pl-12 pr-4 py-3 bg-surface border border-borderSubtle rounded-full text-sm font-medium focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-all"
            />
          </div>

          <div className="w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            <div className="flex gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat
                    ? 'bg-gold text-white shadow-md'
                    : 'bg-canvas border border-borderSubtle text-inkLight hover:text-ink hover:border-gold/50'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Creators Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {creators.map((creator) => (
          <motion.div
            key={creator.id}
            onClick={() => handleCreatorClick(creator)}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="group bg-canvas border border-borderSubtle rounded-3xl overflow-hidden hover:shadow-soft hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="px-6 pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-borderSubtle bg-surface overflow-hidden shadow-sm flex-shrink-0">
                  <img
                    src={creator.profile_picture || "https://picsum.photos/150/150"}
                    alt={creator.username}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="pb-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-ink flex items-center gap-1">
                      {creator.username}
                      {creator.is_verified && (
                        <CheckCircle className="w-4 h-4 text-gold" />
                      )}
                    </h3>
                    <p className="text-sm text-inkLight font-medium">@{creator.username.toLowerCase()}</p>
                  </div>
                  <span className="flex items-center gap-1 bg-surface border border-borderSubtle text-ink text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                    <TrendingUp className="w-3 h-3 text-gold" /> Creator
                  </span>
                </div>

                <p className="text-sm text-inkLight font-medium line-clamp-2 mb-4">
                  {creator.bio || 'Creator on Deorganized platform'}
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1 text-xs font-bold text-inkLight">
                    <Users className="w-3 h-3" />
                    {creator.follower_count || 0} followers
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-inkLight">
                    <Video className="w-3 h-3" />
                    {creatorShows[creator.id]?.length || 0}+ shows
                  </div>
                </div>

                {/* Recent Shows */}
                {creatorShows[creator.id] && creatorShows[creator.id].length > 0 && (
                  <div className="mb-4 pb-4 border-b border-borderSubtle">
                    <p className="text-xs font-bold text-inkLight uppercase tracking-wider mb-2">Recent Shows</p>
                    <div className="space-y-1.5">
                      {creatorShows[creator.id].slice(0, 3).map((show) => (
                        <div key={show.id} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />
                          <span className="text-ink font-medium line-clamp-1">{show.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            </div>
          </motion.div>
        ))}
      </section>
    </div>
  );
};

