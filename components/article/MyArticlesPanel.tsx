import React, { useState, useEffect } from 'react';
import { PenLine, Pencil, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { News, fetchMyArticles, deleteArticle, unpublishArticle } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../Toast';

interface MyArticlesPanelProps {
  onNavigate?: (page: string, id?: string | number) => void;
}

type ConfirmState = { article: News; action: 'delete' | 'unpublish' } | null;

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
  const toast = useToast();
  const [articles, setArticles] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [working, setWorking] = useState(false);

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

  const closeConfirm = () => { if (!working) setConfirm(null); };

  // On-chain note: once inscription is live, an inscribed (published) article's
  // on-chain record is PERMANENT. "Unpublish" only removes it from DeOrganized's
  // public site — the platform record is kept and can be edited/republished.
  // "Delete" is offered for drafts only, so it never affects an inscribed article.
  const performConfirm = async () => {
    if (!confirm || !accessToken) return;
    const { article, action } = confirm;
    setWorking(true);
    try {
      if (action === 'delete') {
        await deleteArticle(article.slug, accessToken);
        setArticles((prev) => prev.filter((a) => a.id !== article.id));
        toast.success('Article deleted.');
      } else {
        const updated = await unpublishArticle(article.slug, accessToken);
        setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, ...updated } : a)));
        toast.success('Article unpublished — moved to drafts.');
      }
      setConfirm(null);
    } catch (err: any) {
      toast.error(err?.message || (action === 'delete' ? 'Failed to delete.' : 'Failed to unpublish.'));
    } finally {
      setWorking(false);
    }
  };

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
                {article.is_published ? (
                  <button
                    onClick={() => setConfirm({ article, action: 'unpublish' })}
                    title="Unpublish"
                    className="flex items-center gap-1.5 text-sm font-bold text-ink bg-surface border border-borderSubtle px-3 py-1.5 rounded-full hover:bg-canvas transition-colors"
                  >
                    <EyeOff className="w-3.5 h-3.5" /> Unpublish
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirm({ article, action: 'delete' })}
                    title="Delete"
                    className="flex items-center gap-1.5 text-sm font-bold text-red-500 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal — delete (drafts) or unpublish (published) */}
      {confirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={closeConfirm}
        >
          <div
            className="bg-canvas border border-borderSubtle rounded-3xl p-6 max-w-md w-full shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-ink mb-2">
              {confirm.action === 'delete' ? 'Delete article?' : 'Unpublish article?'}
            </h3>
            <p className="text-sm text-inkLight mb-6">
              {confirm.action === 'delete' ? (
                <>This permanently removes <span className="font-semibold text-ink">“{confirm.article.title || 'Untitled'}”</span> and its public page. This can’t be undone.</>
              ) : (
                <>This removes <span className="font-semibold text-ink">“{confirm.article.title || 'Untitled'}”</span> from the public site. Your copy is kept as a draft so you can edit and republish it.</>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirm}
                disabled={working}
                className="bg-canvas border border-borderSubtle text-ink font-bold px-5 py-2.5 rounded-full hover:bg-surface transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={performConfirm}
                disabled={working}
                className={`flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-full shadow-lg transition-all disabled:opacity-50 ${
                  confirm.action === 'delete'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    : 'bg-gold-gradient shadow-gold/20 hover:shadow-gold/40'
                }`}
              >
                {working
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : (confirm.action === 'delete' ? <Trash2 className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />)}
                {confirm.action === 'delete' ? 'Delete' : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyArticlesPanel;
