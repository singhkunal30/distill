import EPub from 'epub2';
import { JSDOM } from 'jsdom';
import { writeFile, mkdtemp, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export type ExtractedEpub = {
  title: string | null;
  authors: string[];
  publishedYear: number | null;
  coverDataUrl: string | null;
  chapters: { id: string; title: string; markdown: string }[];
  text: string;
};

export async function extractEpub(bytes: Uint8Array): Promise<ExtractedEpub> {
  const dir = await mkdtemp(path.join(tmpdir(), 'distill-epub-'));
  const filePath = path.join(dir, 'book.epub');
  await writeFile(filePath, bytes);

  try {
    const epub = await EPub.createAsync(filePath);
    const metadata = epub.metadata as Record<string, unknown>;
    const title = typeof metadata.title === 'string' ? metadata.title : null;
    const creator =
      typeof metadata.creator === 'string'
        ? metadata.creator
        : Array.isArray(metadata.creator)
          ? (metadata.creator as string[]).join(', ')
          : null;
    const authors = creator
      ? creator
          .split(/[,;&]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const date = typeof metadata.date === 'string' ? metadata.date : null;
    const publishedYear = date ? Number(date.slice(0, 4)) || null : null;

    const chapters: ExtractedEpub['chapters'] = [];
    for (const chapter of epub.flow) {
      if (!chapter.id) continue;
      try {
        const html = await new Promise<string>((resolve, reject) => {
          epub.getChapter(chapter.id!, (err: Error | null, text?: string) =>
            err ? reject(err) : resolve(text ?? ''),
          );
        });
        const dom = new JSDOM(html);
        const text = (dom.window.document.body?.textContent ?? '').trim();
        if (text.length === 0) continue;
        chapters.push({
          id: chapter.id,
          title: chapter.title ?? `Chapter ${chapters.length + 1}`,
          markdown: htmlToMarkdown(dom),
        });
      } catch {
        continue;
      }
    }

    const text = chapters.map((c) => c.markdown).join('\n\n');

    return {
      title,
      authors,
      publishedYear,
      coverDataUrl: null,
      chapters,
      text,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function htmlToMarkdown(dom: JSDOM): string {
  const out: string[] = [];
  const walk = (node: Node) => {
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
      case 'h4':
        out.push(`\n\n${'#'.repeat(Number(tag[1]))} ${el.textContent?.trim() ?? ''}\n\n`);
        return;
      case 'p':
        out.push('\n\n');
        el.childNodes.forEach(walk);
        out.push('\n\n');
        return;
      case 'em':
      case 'i':
        out.push('*');
        el.childNodes.forEach(walk);
        out.push('*');
        return;
      case 'strong':
      case 'b':
        out.push('**');
        el.childNodes.forEach(walk);
        out.push('**');
        return;
      case 'br':
        out.push('  \n');
        return;
      default:
        el.childNodes.forEach(walk);
    }
  };
  dom.window.document.body?.childNodes.forEach(walk);
  return out.join('').replace(/\n{3,}/g, '\n\n').trim();
}
