import { marked } from 'marked';

// Configure once. We only need GFM essentials; no math or syntax-highlight.
marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
