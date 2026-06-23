import React, { useState, useEffect } from 'react';
import { PenLine, Pencil, Eye, EyeOff, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { News, fetchMyArticles, deleteArticle, archiveArticle, republishArticle } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../Toast';

interface MyArticlesPanelProps {
  onNavigate?: (page: string, id?: string | number) => void;
}

type ArticleStatus = 'draft' | 'published' | 'archived';
type ConfirmAction = 'delete' | 'archive' | 'republish';
type ConfirmState = { article: News; action: ConfirmAction } | null;

const STATUS_META: Record<ArticleStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-surface text-inkLight border-borderSubtle' },
  published: { label: 'Published', cls: 'bg-green-50 text-green-600 border-green-200' },
  archived: { label: 'Archived', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
};

const FILTERS: { key: 'all' | ArticleStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'published', label: 'Published' },
  { key: 'archived', label: 'Archived' },
];

const getStatus = (a: News): ArticleStatus =>
  (a.status as ArticleStatus) || (a.is_published ? 'published' : 'draft');

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const CONFIRM_COPY: Record<ConfirmAction, { title: string; body: (t: string) => React.ReactNode; cta: string; destructive: boolean }> = {
  delete: {
    title: 'Delete article?',
    body: (t) => <>This permanently removes <span className="font-semibold text-ink">“{t}”</span> and its public page. This can’t be undone.</>,
    cta: 'Delete',
    destructive: true,
  },
  archive: {
    title: 'Archive article?',
    body: (t) => <>This removes <span className="font-semibold text-ink">“{t}”</span> from the public site. The record is kept (and its on-chain inscription, once live), and you can republish it any time.</>,
    cta: 'Archive',
    destructive: false,
  },
  republish: {
    title: 'Republish article?',
    body: (t) => <>This puts <span className="font-semibold text-ink">“{t}”</span> back on the public site at its original link.</>,
    cta: 'Republish',
    destructive: false,
  },
};

export const MyArticlesPanel: React.FC<MyArticlesPanelProps> = ({ onNavigate }) => {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [articles, setArticles] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | ArticleStatus>('all');
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

  // On-chain note: once inscription is live, a published article's on-chain record
  // is PERMANENT. Archive only removes it from DeOrganized's public site — the
  // record (and its inscription) is kept and can be republished. Delete is offered
  // for drafts only, so it never affects an inscribed article. Republish never
  // creates a new inscription (that funnels only through publish -> inscribe_article).
  const performConfirm = async () => {
    if (!confirm || !accessToken) return;
    const { article, action } = confirm;
    setWorking(true);
    try {
      if (action === 'delete') {
        await deleteArticle(article.slug, accessToken);
        setArticles((prev) => prev.filter((a) => a.id !== article.id));
        toast.success('Article deleted.');
      } else if (action === 'archive') {
        const updated = await archiveArticle(article.slug, accessToken);
        setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, ...updated } : a)));
        toast.success('Article archived — removed from the public site.');
      } else {
        const updated = await republishArticle(article.slug, accessToken);
        setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, ...updated } : a)));
        toast.success('Article republished — live again.');
      }
      setConfirm(null);
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${action}.`);
    } finally {
      setWorking(false);
    }
  };

  const visible = filter === 'all' ? articles : articles.filter((a) => getStatus(a) === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">Your Articles</h2>
          <p className="text-inkLight text-sm mt-1">Drafts, published, and archived — your full body of work.</p>
        </div>
        <button
          onClick={() => onNavigate?.('article-editor')}
          className="flex items-center gap-2 bg-gold-gradient text-white font-bold px-5 py-2.5 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all"
        >
          <PenLine className="w-4 h-4" /> New article
        </button>
      </div>

      {/* State filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? articles.length : articles.filter((a) => getStatus(a) === f.key).length;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                filter === f.key ? 'bg-gold text-white' : 'bg-canvas border border-borderSubtle text-inkLight hover:text-ink'
              }`}
            >
              {f.label} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-inkLight py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading your articles…
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-canvas border border-borderSubtle rounded-3xl p-10 text-center">
          <div className="text-5xl mb-3">✍️</div>
          <h3 className="text-lg font-bold text-ink mb-1">{filter === 'all' ? 'No articles yet' : `No ${filter} articles`}</h3>
          <p className="text-inkLight text-sm">{filter === 'all' ? 'Click “New article” to write your first one.' : 'Nothing here for this filter.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((article) => {
            const st = getStatus(article);
            return (
              <div
                key={article.id}
                className="flex items-center gap-4 bg-canvas border border-borderSubtle rounded-2xl p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_META[st].cls}`}>
                      {STATUS_META[st].label}
                    </span>
                    <span className="text-xs text-inkLight">
                      {st === 'published' ? formatDate(article.published_at) : `Updated ${formatDate(article.updated_at)}`}
                    </span>
                    {/* Inscription link placeholder: once inscription is live and the
                        record carries a link, render it here (esp. for archived work). */}
                    {article.inscription_status && article.inscription_status !== 'none' && (
                      <span className="text-[11px] font-semibold text-gold">· inscription {article.inscription_status}</span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-ink truncate mt-1">{article.title || 'Untitled'}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {st === 'published' && (
                    <button
                      onClick={() => onNavigate?.('article-detail', article.slug)}
                      title="View"
                      className="p-2 rounded-lg text-inkLight hover:text-ink hover:bg-surface transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}

                  {/* draft & published can be edited; archived must be republished first */}
                  {(st === 'draft' || st === 'published') && (
                    <button
                      onClick={() => onNavigate?.('article-editor', article.slug)}
                      className="flex items-center gap-1.5 text-sm font-bold text-ink bg-surface border border-borderSubtle px-3 py-1.5 rounded-full hover:bg-canvas transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}

                  {st === 'draft' && (
                    <button
                      onClick={() => setConfirm({ article, action: 'delete' })}
                      title="Delete"
                      className="flex items-center gap-1.5 text-sm font-bold text-red-500 border border-red-200 px-3 py-1.5 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}

                  {st === 'published' && (
                    <button
                      onClick={() => setConfirm({ article, action: 'archive' })}
                      title="Archive"
                      className="flex items-center gap-1.5 text-sm font-bold text-ink bg-surface border border-borderSubtle px-3 py-1.5 rounded-full hover:bg-canvas transition-colors"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Archive
                    </button>
                  )}

                  {st === 'archived' && (
                    <button
                      onClick={() => setConfirm({ article, action: 'republish' })}
                      title="Republish"
                      className="flex items-center gap-1.5 text-sm font-bold text-white bg-gold-gradient px-3 py-1.5 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Republish
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation modal */}
      {confirm && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={closeConfirm}
        >
          <div
            className="bg-canvas border border-borderSubtle rounded-3xl p-6 max-w-md w-full shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-ink mb-2">{CONFIRM_COPY[confirm.action].title}</h3>
            <p className="text-sm text-inkLight mb-6">{CONFIRM_COPY[confirm.action].body(confirm.article.title || 'Untitled')}</p>
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
                  CONFIRM_COPY[confirm.action].destructive
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                    : 'bg-gold-gradient shadow-gold/20 hover:shadow-gold/40'
                }`}
              >
                {working && <Loader2 className="w-4 h-4 animate-spin" />}
                {CONFIRM_COPY[confirm.action].cta}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyArticlesPanel;
