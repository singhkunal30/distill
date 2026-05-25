import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export type ExtractedArticle = {
  title: string;
  byline: string | null;
  excerpt: string | null;
  contentHtml: string;
  contentText: string;
  contentMd: string;
  siteName: string | null;
  publishedTime: string | null;
};

export async function extractArticle(url: string): Promise<ExtractedArticle> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; Distill/0.1; +https://distill.local)',
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed (${res.status}) for ${url}`);
  }
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const parsed = reader.parse();
  if (!parsed) {
    throw new Error('Readability could not extract an article from this URL.');
  }
  const contentText = parsed.textContent.trim();
  const contentMd = htmlToMarkdown(parsed.content ?? '');
  return {
    title: parsed.title || 'Untitled article',
    byline: parsed.byline ?? null,
    excerpt: parsed.excerpt ?? null,
    contentHtml: parsed.content ?? '',
    contentText,
    contentMd,
    siteName: parsed.siteName ?? null,
    publishedTime: parsed.publishedTime ?? null,
  };
}

// Minimal HTML → Markdown converter sufficient for article bodies.
// We deliberately avoid pulling in turndown/showdown to keep the bundle
// small; readers tolerate plain paragraphs with a few formatting cues.
function htmlToMarkdown(html: string): string {
  const dom = new JSDOM(`<!DOCTYPE html><body>${html}</body>`);
  const out: string[] = [];
  const walk = (node: Node, depth = 0) => {
    if (node.nodeType === dom.window.Node.TEXT_NODE) {
      out.push(node.textContent ?? '');
      return;
    }
    if (node.nodeType !== dom.window.Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4': {
        const hashes = '#'.repeat(Number(tag[1]));
        out.push(`\n\n${hashes} ${el.textContent?.trim() ?? ''}\n\n`);
        return;
      }
      case 'p':
        out.push('\n\n');
        el.childNodes.forEach((c) => walk(c, depth + 1));
        out.push('\n\n');
        return;
      case 'br':
        out.push('  \n');
        return;
      case 'strong':
      case 'b':
        out.push('**');
        el.childNodes.forEach((c) => walk(c, depth + 1));
        out.push('**');
        return;
      case 'em':
      case 'i':
        out.push('*');
        el.childNodes.forEach((c) => walk(c, depth + 1));
        out.push('*');
        return;
      case 'a': {
        const href = el.getAttribute('href') ?? '';
        out.push('[');
        el.childNodes.forEach((c) => walk(c, depth + 1));
        out.push(`](${href})`);
        return;
      }
      case 'ul':
      case 'ol':
        out.push('\n\n');
        Array.from(el.children).forEach((child, idx) => {
          if (child.tagName.toLowerCase() === 'li') {
            const bullet = tag === 'ol' ? `${idx + 1}.` : '-';
            out.push(`${bullet} `);
            child.childNodes.forEach((c) => walk(c, depth + 1));
            out.push('\n');
          }
        });
        out.push('\n');
        return;
      case 'blockquote':
        out.push('\n\n> ');
        el.childNodes.forEach((c) => walk(c, depth + 1));
        out.push('\n\n');
        return;
      case 'code':
        out.push('`');
        out.push(el.textContent ?? '');
        out.push('`');
        return;
      case 'pre':
        out.push('\n\n```\n');
        out.push(el.textContent ?? '');
        out.push('\n```\n\n');
        return;
      case 'figure':
      case 'figcaption':
      case 'aside':
        return;
      default:
        el.childNodes.forEach((c) => walk(c, depth + 1));
    }
  };
  dom.window.document.body.childNodes.forEach((c) => walk(c));
  return out
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
