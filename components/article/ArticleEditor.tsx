import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote,
  Link2, Image as ImageIcon, Loader2, Send, Save, ArrowLeft, X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../Toast';
import {
  ArticlePayload, MentionUser, getImageUrl,
  createArticle, updateArticle, publishArticle, uploadArticleImage,
  searchUsers, fetchNewsBySlug,
} from '../../lib/api';
import { MentionLink, SafeLink } from './mentionExtension';

interface ArticleEditorProps {
  onNavigate?: (page: string, id?: string | number) => void;
  slug?: string; // present when editing an existing draft
}

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'update', label: 'Update' },
  { value: 'feature', label: 'Feature' },
  { value: 'review', label: 'Review' },
  { value: 'interview', label: 'Interview' },
];

type MentionRect = { top: number; left: number; bottom: number } | null;
type MentionCommand = (item: { id: number | string; label: string }) => void;

interface MentionState {
  items: MentionUser[];
  command: MentionCommand | null;
  rect: MentionRect;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    // preventDefault on mousedown keeps the editor selection intact
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
      active ? 'bg-gold text-white' : 'text-inkLight hover:text-ink hover:bg-surface'
    }`}
  >
    {children}
  </button>
);

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ onNavigate, slug }) => {
  const { isBackendAuthenticated, accessToken, backendUser, connectWallet } = useAuth();
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [coverUrl, setCoverUrl] = useState('');

  const [currentSlug, setCurrentSlug] = useState<string | null>(slug ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [notOwner, setNotOwner] = useState(false);

  const accessTokenRef = useRef(accessToken);
  useEffect(() => { accessTokenRef.current = accessToken; }, [accessToken]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // --- @-mention typeahead state (driven by the TipTap suggestion plugin) ---
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const mentionIndexRef = useRef(0);
  const mentionStateRef = useRef<MentionState | null>(null);
  useEffect(() => { mentionStateRef.current = mentionState; }, [mentionState]);

  const setMentionIdx = (i: number) => { mentionIndexRef.current = i; setMentionIndex(i); };

  const suggestion = useRef({
    char: '@',
    allowSpaces: false,
    items: async ({ query }: { query: string }) => {
      const q = (query || '').trim();
      if (!q) return [];
      const users = await searchUsers(q, accessTokenRef.current || undefined);
      return users.slice(0, 6);
    },
    render: () => {
      const applyState = (props: any) => {
        const rect = props.clientRect?.();
        setMentionState({
          items: props.items,
          command: props.command,
          rect: rect ? { top: rect.top, left: rect.left, bottom: rect.bottom } : null,
        });
      };
      return {
        onStart: (props: any) => { setMentionIdx(0); applyState(props); },
        onUpdate: (props: any) => { setMentionIdx(0); applyState(props); },
        onKeyDown: (props: any) => {
          const items = mentionStateRef.current?.items || [];
          const key = props.event.key;
          if (key === 'ArrowDown') {
            if (items.length) setMentionIdx((mentionIndexRef.current + 1) % items.length);
            return true;
          }
          if (key === 'ArrowUp') {
            if (items.length) setMentionIdx((mentionIndexRef.current + items.length - 1) % items.length);
            return true;
          }
          if (key === 'Enter') {
            const item = items[mentionIndexRef.current];
            const command = mentionStateRef.current?.command;
            if (item && command) { command({ id: item.id, label: item.username }); return true; }
            return false;
          }
          if (key === 'Escape') { setMentionState(null); return true; }
          return false;
        },
        onExit: () => setMentionState(null),
      };
    },
  }).current;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      SafeLink.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image.configure({ inline: false, HTMLAttributes: { class: 'article-image' } }),
      Placeholder.configure({ placeholder: 'Write your article… type “@” to mention someone.' }),
      MentionLink.configure({ HTMLAttributes: { class: 'mention' }, suggestion }),
    ],
    editorProps: {
      attributes: { class: 'article-prose focus:outline-none min-h-[320px] py-2' },
    },
    content: '',
  });

  // Load an existing draft for editing
  useEffect(() => {
    if (!slug || !editor) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const article = await fetchNewsBySlug(slug);
        if (cancelled) return;
        setTitle(article.title || '');
        setExcerpt(article.excerpt || '');
        setCategory(article.category || 'general');
        setTags(article.tags || '');
        setCoverUrl(article.featured_image || '');
        setCurrentSlug(article.slug);
        if (backendUser && article.author && article.author.id !== backendUser.id) {
          setNotOwner(true);
        }
        editor.commands.setContent(article.content || '');
      } catch {
        if (!cancelled) toast.error('Could not load this article.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, editor]);

  const buildPayload = useCallback((): ArticlePayload => ({
    title: title.trim(),
    content: editor?.getHTML() || '',
    excerpt: excerpt.trim(),
    category,
    tags: tags.trim(),
    featured_image_url: coverUrl || undefined,
  }), [title, excerpt, category, tags, coverUrl, editor]);

  // Create-or-update; returns the article slug.
  const ensureSaved = useCallback(async (): Promise<string> => {
    if (!accessToken) throw new Error('Please sign in to save.');
    if (!title.trim()) throw new Error('Add a title before saving.');
    const payload = buildPayload();
    if (currentSlug) {
      const updated = await updateArticle(currentSlug, payload, accessToken);
      if (!updated?.slug) {
        throw new Error('Save failed: the server did not return an article id. Please try again.');
      }
      return updated.slug;
    }
    const created = await createArticle({ ...payload, is_published: false }, accessToken);
    if (!created?.slug) {
      // Guard against an identifier-less response so we never lose track of the
      // draft or navigate to /write/undefined.
      throw new Error('Save failed: the server did not return an article id. Please try again.');
    }
    setCurrentSlug(created.slug);
    // keep the URL in sync so a refresh keeps editing this draft
    window.history.replaceState({}, '', `/write/${created.slug}`);
    return created.slug;
  }, [accessToken, title, buildPayload, currentSlug]);

  const handleSaveDraft = async () => {
    if (saving || publishing) return;
    setSaving(true);
    try {
      await ensureSaved();
      toast.success('Draft saved.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (saving || publishing) return;
    if (!editor || !editor.getText().trim()) {
      toast.error('Write some content before publishing.');
      return;
    }
    setPublishing(true);
    try {
      const savedSlug = await ensureSaved();
      const published = await publishArticle(savedSlug, accessToken!);
      toast.success('Article published!');
      onNavigate?.('article-detail', published.slug);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to publish.');
    } finally {
      setPublishing(false);
    }
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    if (!accessToken) { toast.error('Please sign in to upload images.'); return; }
    setUploadingImage(true);
    try {
      const url = await uploadArticleImage(file, accessToken);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err: any) {
      toast.error(err?.message || 'Image upload failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!accessToken) { toast.error('Please sign in to upload images.'); return; }
    setUploadingCover(true);
    try {
      const url = await uploadArticleImage(file, accessToken);
      setCoverUrl(url);
    } catch (err: any) {
      toast.error(err?.message || 'Cover upload failed.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSetLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (!isBackendAuthenticated) {
    return (
      <div className="min-h-screen pt-28 pb-20 px-6 flex items-center justify-center">
        <div className="bg-canvas border border-borderSubtle rounded-3xl p-10 max-w-md text-center shadow-soft">
          <h1 className="text-2xl font-bold text-ink mb-3">Sign in to write</h1>
          <p className="text-inkLight mb-6">Connect your Stacks wallet to start writing an article.</p>
          <button
            onClick={connectWallet}
            className="bg-gold-gradient text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const busy = saving || publishing;

  return (
    <div className="min-h-screen pt-24 pb-24 container max-w-[840px] mx-auto px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <button
          onClick={() => onNavigate?.('dashboard')}
          className="flex items-center gap-2 text-inkLight hover:text-ink font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveDraft}
            disabled={busy || notOwner}
            className="flex items-center gap-2 bg-canvas border border-borderSubtle text-ink font-bold px-5 py-2.5 rounded-full hover:bg-surface transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save draft
          </button>
          <button
            onClick={handlePublish}
            disabled={busy || notOwner}
            className="flex items-center gap-2 bg-gold-gradient text-white font-bold px-6 py-2.5 rounded-full shadow-lg shadow-gold/20 hover:shadow-gold/40 transition-all disabled:opacity-50"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>

      {notOwner && (
        <div className="mb-6 px-4 py-3 rounded-2xl bg-gold-50 text-gold border border-gold-100 text-sm font-semibold">
          You can view this article but you’re not the author, so saving and publishing are disabled.
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-inkLight">Loading…</div>
      ) : (
        <>
          {/* Cover image */}
          <div className="mb-6">
            {coverUrl ? (
              <div className="relative rounded-3xl overflow-hidden border border-borderSubtle">
                <img src={getImageUrl(coverUrl) || coverUrl} alt="Cover" className="w-full max-h-80 object-cover" />
                <button
                  onClick={() => setCoverUrl('')}
                  className="absolute top-3 right-3 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors"
                  title="Remove cover"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="w-full flex items-center justify-center gap-2 py-8 border-2 border-dashed border-borderSubtle rounded-3xl text-inkLight hover:text-ink hover:border-gold/40 transition-all"
              >
                {uploadingCover ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                {uploadingCover ? 'Uploading cover…' : 'Add a cover image'}
              </button>
            )}
            <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={handleCoverFile} />
          </div>

          {/* Title */}
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Article title"
            rows={1}
            className="w-full bg-transparent text-4xl md:text-5xl font-bold text-ink leading-tight placeholder:text-inkLight/40 focus:outline-none resize-none mb-4"
          />

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink focus:outline-none focus:border-gold"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tags, comma, separated"
              className="flex-1 min-w-[200px] bg-surface border border-borderSubtle rounded-xl px-3 py-2 text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold"
            />
          </div>

          {/* Toolbar */}
          <div className="sticky top-20 z-10 flex flex-wrap items-center gap-1 bg-canvas/95 backdrop-blur border border-borderSubtle rounded-2xl px-2 py-1.5 mb-4">
            <ToolbarButton title="Heading 2" active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton title="Heading 3" active={editor?.isActive('heading', { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolbarButton>
            <div className="w-px h-5 bg-borderSubtle mx-1" />
            <ToolbarButton title="Bold" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton title="Italic" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolbarButton>
            <div className="w-px h-5 bg-borderSubtle mx-1" />
            <ToolbarButton title="Bullet list" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton title="Numbered list" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton title="Quote" active={editor?.isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolbarButton>
            <div className="w-px h-5 bg-borderSubtle mx-1" />
            <ToolbarButton title="Link" active={editor?.isActive('link')} onClick={handleSetLink}><Link2 className="w-4 h-4" /></ToolbarButton>
            <ToolbarButton title="Insert image" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()}>
              {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            </ToolbarButton>
            <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageFile} />
          </div>

          {/* Editor surface */}
          <div className="bg-canvas border border-borderSubtle rounded-3xl px-5 md:px-7 py-4">
            <EditorContent editor={editor} />
          </div>

          {/* Excerpt */}
          <div className="mt-6">
            <label className="block text-xs font-bold text-inkLight uppercase tracking-wide mb-2">Excerpt (preview summary)</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value.slice(0, 500))}
              placeholder="A short summary shown in listings and link previews…"
              rows={2}
              className="w-full bg-surface border border-borderSubtle rounded-2xl px-4 py-3 text-sm text-ink placeholder:text-inkLight/50 focus:outline-none focus:border-gold resize-none"
            />
            <p className="text-xs text-inkLight mt-1 text-right">{excerpt.length}/500</p>
          </div>
        </>
      )}

      {/* @-mention dropdown */}
      {mentionState && mentionState.rect && mentionState.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed z-[200] w-64 bg-canvas border border-borderSubtle rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
          style={{ top: mentionState.rect.bottom + 6, left: mentionState.rect.left }}
        >
          {mentionState.items.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); mentionState.command?.({ id: u.id, label: u.username }); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === mentionIndex ? 'bg-surface' : 'hover:bg-surface'
              }`}
            >
              <img
                src={getImageUrl(u.profile_picture) || '/default-avatar.png'}
                alt={u.username}
                className="w-7 h-7 rounded-full object-cover"
              />
              <span className="text-sm font-medium text-ink truncate">@{u.username}</span>
              {u.is_verified && <span className="text-gold text-xs ml-auto">✓</span>}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ArticleEditor;
