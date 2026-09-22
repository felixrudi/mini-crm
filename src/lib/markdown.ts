import { Marked } from 'marked';

const SAFE_URL = /^(https?:|mailto:|tel:)/i;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const md = new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
    image({ text }) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      if (!SAFE_URL.test(href.trim())) return inner;
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(href)}"${t} target="_blank" rel="noopener noreferrer nofollow">${inner}</a>`;
    }
  }
});

/** Markdown zu HTML, ohne rohes HTML, ohne Bilder, nur sichere Links. */
export function renderMarkdown(src: string): string {
  return md.parse(src, { async: false }) as string;
}
