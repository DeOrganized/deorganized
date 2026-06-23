import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, PenLine } from 'lucide-react';
import { News, fetchPublishedArticles, getImageUrl } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

interface NewsIndexProps {
  onNavigate?: (page: string, id?: string | number) => void;
}

const CATEGORIES = ['all', 'general', 'announcement', 'update', 'feature', 'review', 'interview'];

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const NewsIndex: React.FC<NewsIndexProps> = ({ onNavigate }) => {
  const { isBackendAuthenticated } = useAuth();
  const [articles, setArticles] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchPublishedArticles(category === 'all' ? undefined : category)
      .then((data) => { if (!cancelled) setArticles(data); })
      .catch(() => { if (!cancelled) setArticles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [category]);

  return (
    <div className="min-h-screen pt-24 pb-20 container max-w-[1280px] mx-auto px-6">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight">News</h1>
          <p className="text-inkLight mt-2">Stories and updates from the DeOrganized community.</p>
        </div>
        {isBackendAuthenticated && (
          <button
            onClick={() => onNavigate?.('article-editor')}
            className="flex items-center gap-2 bg-gold-gradient text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 hover:-translate-y-0.5 transition-all"
          >
            <PenLine className="w-4 h-4" /> Write
          </button>
        )}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold capitalize transition-all ${
              category === c
                ? 'bg-gold text-white'
                : 'bg-canvas border border-borderSubtle text-inkLight hover:text-ink'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20"><p className="text-inkLight">Loading articles…</p></div>
      ) : articles.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📰</div>
          <h2 className="text-2xl font-bold text-ink mb-2">No articles yet</h2>
          <p className="text-inkLight">Be the first to publish a story.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => onNavigate?.('article-detail', article.slug)}
              className="group text-left bg-canvas border border-borderSubtle rounded-3xl overflow-hidden hover:shadow-soft transition-all duration-300 flex flex-col h-full"
            >
              <div className="relative aspect-video overflow-hidden bg-surface">
                {article.featured_image ? (
                  <img
                    src={getImageUrl(article.featured_image) || ''}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">📝</div>
                )}
                <span className="absolute top-3 left-3 bg-gold-50 text-gold border border-gold-100 px-3 py-1 rounded-full text-xs font-bold capitalize">
                  {article.category}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-ink leading-snug mb-2 line-clamp-2 group-hover:text-gold transition-colors">
                  {article.title}
                </h3>
                {article.excerpt && (
                  <p className="text-sm text-inkLight line-clamp-3 mb-4">{article.excerpt}</p>
                )}
                <div className="mt-auto flex items-center justify-between text-xs text-inkLight">
                  <span className="font-semibold">
                    {article.author?.username ? `@${article.author.username}` : ''} · {formatDate(article.published_at)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {article.like_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {article.comment_count}</span>
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsIndex;
