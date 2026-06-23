import React, { useState, useEffect } from 'react';
import { PenLine, Pencil, Eye, Loader2 } from 'lucide-react';
import { News, fetchMyArticles } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';

interface MyArticlesPanelProps {
  onNavigate?: (page: string, id?: string | number) => void;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export const MyArticlesPanel: React.FC<MyArticlesPanelProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const [articles, setArticles] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    fetchMyArticles(accessToken)
      .then((data) => { if (!cancelled) setArticles(data); })
      .catch(() => { if (!cancelled) setArticles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Your Articles</h2>
          <p className="text-inkLight text-sm mt-1">Write, edit drafts, and publish.</p>
        </div>
        <button
          onClick={() => onNavigate?.('article-editor')}
          className="flex items-center gap-2 bg-gold-gradient text-white font-bold px-5 py-2.5 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all"
        >
          <PenLine className="w-4 h-4" /> New article
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-inkLight py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your articles…
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-canvas border border-borderSubtle rounded-3xl p-10 text-center">
          <div className="text-5xl mb-3">✍️</div>
          <h3 className="text-lg font-bold text-ink mb-1">No articles yet</h3>
          <p className="text-inkLight text-sm">Click “New article” to write your first one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="flex items-center gap-4 bg-canvas border border-borderSubtle rounded-2xl p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    article.is_published
                      ? 'bg-green-50 text-green-600 border border-green-200'
                      : 'bg-surface text-inkLight border border-borderSubtle'
                  }`}>
                    {article.is_published ? 'Published' : 'Draft'}
                  </span>
                  <span className="text-xs text-inkLight">
                    {article.is_published ? formatDate(article.published_at) : `Updated ${formatDate(article.updated_at)}`}
                  </span>
                </div>
                <h3 className="text-base font-bold text-ink truncate mt-1">{article.title || 'Untitled'}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {article.is_published && (
                  <button
                    onClick={() => onNavigate?.('article-detail', article.slug)}
                    title="View"
                    className="p-2 rounded-lg text-inkLight hover:text-ink hover:bg-surface transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onNavigate?.('article-editor', article.slug)}
                  className="flex items-center gap-1.5 text-sm font-bold text-ink bg-surface border border-borderSubtle px-3 py-1.5 rounded-full hover:bg-canvas transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyArticlesPanel;
