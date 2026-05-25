// Plain text / markdown ingestion. Treats the file as-is, normalising
// line endings and trimming. If the input looks like Markdown already
// (has #, *, etc.) we leave it; otherwise we wrap as plain paragraphs.

export type ExtractedText = {
  text: string;
  markdown: string;
  approxWords: number;
};

export function extractText(input: string, asMarkdown: boolean): ExtractedText {
  const normalized = input.replace(/\r\n/g, '\n').trim();
  const approxWords = normalized.split(/\s+/).filter(Boolean).length;
  if (asMarkdown) {
    return { text: normalized, markdown: normalized, approxWords };
  }
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
  return {
    text: normalized,
    markdown: paragraphs.join('\n\n'),
    approxWords,
  };
}
