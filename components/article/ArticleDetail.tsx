import React, { useState, useEffect } from 'react';
import {
  Heart, MessageCircle, ArrowLeft, Link2, Mail, Copy, Check, Share2, Pencil,
} from 'lucide-react';
import {
  News, Comment, API_BASE_URL, getImageUrl, fetchNewsBySlug,
  toggleLike, checkIfLiked, fetchComments, createComment,
} from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../Toast';

interface ArticleDetailProps {
  onNavigate?: (page: string, id?: string | number) => void;
  slug: string;
}

const formatDate = (iso?: string | null) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
};

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ onNavigate, slug }) => {
  const { backendUser, accessToken } = useAuth();
  const toast = useToast();

  const [article, setArticle] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/read/${slug}` : '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const data = await fetchNewsBySlug(slug);
        if (cancelled) return;
        setArticle(data);
        setLikeCount(data.like_count || 0);

        // Fire-and-forget view increment
        fetch(`${API_BASE_URL}/news/${slug}/increment_view/`, { method: 'POST' }).catch(() => {});

        // Comments
        fetchComments('news', data.id, true, accessToken || undefined)
          .then((cs) => { if (!cancelled) setComments(cs); })
          .catch(() => {});

        // Liked?
        if (backendUser) {
          checkIfLiked('news', data.id, backendUser.id)
            .then((liked) => { if (!cancelled) setIsLiked(liked); })
            .catch(() => {});
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, backendUser?.id]);

  const handleLike = async () => {
    if (!article) return;
    if (!accessToken || !backendUser) { toast.error('Sign in to like this article.'); return; }
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      await toggleLike('news', article.id, accessToken);
    } catch {
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
      toast.error('Could not update like.');
    }
  };

  const handleAddComment = async () => {
    if (!article) return;
    if (!accessToken) { toast.error('Sign in to comment.'); return; }
    if (!commentText.trim()) return;
    setPostingComment(true);
    try {
      const created = await createComment('news', article.id, commentText.trim(), accessToken);
      setComments((prev) => [created, ...prev]);
      setCommentText('');
    } catch {
      toast.error('Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link.');
    }
  };

  // Route mention clicks inside the rendered HTML through the SPA router.
  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;
    if (anchor.getAttribute('data-type') === 'mention') {
      e.preventDefault();
      const username =
        anchor.getAttribute('data-username') ||
        (anchor.getAttribute('href') || '').split('/').pop();
      if (username) onNavigate?.('creator-detail', username);
    }
  };

  if (loading) {
    return <div className="min-h-screen pt-28 pb-20 text-center text-inkLight">Loading…</div>;
  }
  if (notFound || !article) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-6 text-center">
        <h1 className="text-2xl font-bold text-ink mb-3">Article not found</h1>
        <button onClick={() => onNavigate?.('news')} className="text-gold font-bold">← Back to News</button>
      </div>
    );
  }

  const isAuthor = backendUser && article.author && backendUser.id === article.author.id;

  const shareLinks = [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(shareUrl)}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}` },
  ];
  const mailto = `mailto:?subject=${encodeURIComponent(article.title)}&body=${encodeURIComponent(shareUrl)}`;

  return (
    <article className="min-h-screen pt-24 pb-24 container max-w-[760px] mx-auto px-6">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => onNavigate?.('news')}
          className="flex items-center gap-2 text-inkLight hover:text-ink font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> News
        </button>
        {isAuthor && (
          <button
            onClick={() => onNavigate?.('article-editor', article.slug)}
            className="flex items-center gap-2 text-inkLight hover:text-ink font-semibold transition-colors"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {/* Category */}
      <span className="inline-block bg-gold-50 text-gold border border-gold-100 px-3 py-1 rounded-full text-xs font-bold capitalize mb-4">
        {article.category}
      </span>

      {/* Title */}
      <h1 className="text-4xl md:text-5xl font-bold text-ink leading-tight mb-6">{article.title}</h1>

      {/* Byline */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => article.author?.username && onNavigate?.('creator-detail', article.author.username)}
          className="flex items-center gap-3 group"
        >
          <img
            src={getImageUrl(article.author?.profile_picture) || '/default-avatar.png'}
            alt={article.author?.username || ''}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="text-left">
            <p className="text-sm font-bold text-ink group-hover:text-gold transition-colors">
              @{article.author?.username}
            </p>
            <p className="text-xs text-inkLight">{formatDate(article.published_at)}</p>
          </div>
        </button>
      </div>

      {/* Cover */}
      {article.featured_image && (
        <img
          src={getImageUrl(article.featured_image) || ''}
          alt={article.title}
          className="w-full rounded-3xl border border-borderSubtle mb-10 object-cover max-h-[460px]"
        />
      )}

      {/* Body */}
      <div
        className="article-prose"
        onClick={handleBodyClick}
        dangerouslySetInnerHTML={{ __html: article.content }}
      />

      {/* Engagement bar */}
      <div className="flex items-center gap-3 mt-12 mb-10 border-y border-borderSubtle py-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all ${
            isLiked ? 'bg-red-50 text-red-500 border border-red-200' : 'bg-surface text-inkLight hover:bg-red-50 hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} /> {likeCount}
        </button>
        <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface text-inkLight font-semibold">
          <MessageCircle className="w-4 h-4" /> {comments.length}
        </span>
      </div>

      {/* Share */}
      <section className="bg-canvas border border-borderSubtle rounded-3xl p-6 mb-12">
        <h3 className="flex items-center gap-2 text-lg font-bold text-ink mb-4">
          <Share2 className="w-5 h-5 text-gold" /> Share this article
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={copyLink}
            className="flex items-center gap-2 bg-surface border border-borderSubtle text-ink font-semibold px-4 py-2 rounded-full hover:bg-canvas transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          {shareLinks.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-surface border border-borderSubtle text-ink font-semibold px-4 py-2 rounded-full hover:bg-canvas transition-all"
            >
              {s.label}
            </a>
          ))}
          <a
            href={mailto}
            className="flex items-center gap-2 bg-surface border border-borderSubtle text-ink font-semibold px-4 py-2 rounded-full hover:bg-canvas transition-all"
          >
            <Mail className="w-4 h-4" /> Email
          </a>
        </div>
        <p className="text-xs text-inkLight mt-3">More sharing options coming soon.</p>
      </section>

      {/* Comments */}
      <section>
        <h3 className="text-xl font-bold text-ink mb-4">Comments ({comments.length})</h3>
        {accessToken ? (
          <div className="flex flex-col gap-3 mb-8">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              rows={3}
              className="w-full bg-surface border border-borderSubtle rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold resize-none"
            />
            <button
              onClick={handleAddComment}
              disabled={postingComment || !commentText.trim()}
              className="self-end bg-gold-gradient text-white font-bold px-6 py-2.5 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all disabled:opacity-50"
            >
              {postingComment ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        ) : (
          <p className="text-inkLight mb-8">Sign in to join the conversation.</p>
        )}

        <div className="flex flex-col gap-5">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <img
                src={getImageUrl(c.user?.profile_picture) || '/default-avatar.png'}
                alt={c.user?.username || ''}
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">@{c.user?.username}</span>
                  <span className="text-xs text-inkLight">{formatDate(c.created_at)}</span>
                </div>
                <p className="text-sm text-ink mt-1 whitespace-pre-wrap">{c.text}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-inkLight text-sm">No comments yet. Be the first.</p>
          )}
        </div>
      </section>
    </article>
  );
};

export default ArticleDetail;
