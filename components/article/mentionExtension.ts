import Mention from '@tiptap/extension-mention';
import Link from '@tiptap/extension-link';
import { mergeAttributes } from '@tiptap/core';

/**
 * Mentions render as internal profile links, so they survive in the saved
 * (sanitized) HTML and round-trip back into editable mention chips. Output:
 *
 *   <a data-type="mention" class="mention" data-id="5" data-username="alice"
 *      href="/creators/alice">@alice</a>
 *
 * The reader intercepts clicks on these anchors and routes them through the SPA
 * (see ArticleDetail), so they never trigger a full page load.
 */
export const MentionLink = Mention.extend({
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-id'),
        renderHTML: (attrs) => (attrs.id ? { 'data-id': String(attrs.id) } : {}),
      },
      label: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute('data-username') || (el.textContent || '').replace(/^@/, ''),
        renderHTML: (attrs) => (attrs.label ? { 'data-username': attrs.label } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const username = node.attrs.label || '';
    return [
      'a',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'mention',
        href: `/creators/${username}`,
      }),
      `@${username}`,
    ];
  },

  renderText({ node }) {
    return `@${node.attrs.label}`;
  },
});

/**
 * Stop the Link mark from also claiming mention anchors when parsing saved HTML —
 * mention anchors are owned by the MentionLink node above.
 */
export const SafeLink = Link.extend({
  parseHTML() {
    return [{ tag: 'a[href]:not([data-type="mention"])' }];
  },
});
