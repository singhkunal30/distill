import { extractText, getDocumentProxy } from 'unpdf';

export type ExtractedPdf = {
  title: string | null;
  authors: string[];
  pageCount: number;
  text: string;
};

export async function extractPdf(bytes: Uint8Array): Promise<ExtractedPdf> {
  const pdf = await getDocumentProxy(bytes);
  const pageCount = pdf.numPages;
  const { text } = await extractText(pdf, { mergePages: true });

  // unpdf returns either a string or string[] depending on version; normalize.
  const flat = Array.isArray(text) ? text.join('\n\n') : text;

  // Pull title/authors from PDF metadata when available.
  let title: string | null = null;
  let authors: string[] = [];
  try {
    const meta = await pdf.getMetadata();
    // The `info` object is unknown-typed in pdf.js; cast loosely.
    const info = meta?.info as Record<string, unknown> | undefined;
    if (info && typeof info.Title === 'string' && info.Title.trim()) {
      title = info.Title.trim();
    }
    if (info && typeof info.Author === 'string' && info.Author.trim()) {
      authors = info.Author.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    // metadata read can fail on malformed PDFs — leave as null.
  }

  return {
    title,
    authors,
    pageCount,
    text: cleanPdfText(flat),
  };
}

// PDFs often arrive with hard-wrapped lines, stray hyphens, and excess
// whitespace. Normalize to readable paragraphs.
function cleanPdfText(input: string): string {
  return input
    .replace(/-\n(?=\w)/g, '') // de-hyphenate line breaks
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n([^\n])/g, '$1 $2') // unwrap soft breaks
    .trim();
}
