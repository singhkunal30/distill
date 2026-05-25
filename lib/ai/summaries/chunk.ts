// Conservative chunking by paragraph, capped at ~6k tokens (~21k chars).
// Returns the original ordering preserved.

export const TARGET_CHUNK_CHARS = 21_000;

export function chunkContent(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (cleaned.length <= TARGET_CHUNK_CHARS) return [cleaned];

  const paragraphs = cleaned.split(/\n{2,}/);
  const chunks: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;
  for (const para of paragraphs) {
    if (bufLen + para.length + 2 > TARGET_CHUNK_CHARS && buf.length > 0) {
      chunks.push(buf.join('\n\n'));
      buf = [];
      bufLen = 0;
    }
    // A single paragraph longer than the target — break by sentence.
    if (para.length > TARGET_CHUNK_CHARS) {
      const sentences = para.split(/(?<=[.!?])\s+/);
      let sbuf: string[] = [];
      let sbufLen = 0;
      for (const s of sentences) {
        if (sbufLen + s.length > TARGET_CHUNK_CHARS) {
          if (sbuf.length > 0) chunks.push(sbuf.join(' '));
          sbuf = [s];
          sbufLen = s.length;
        } else {
          sbuf.push(s);
          sbufLen += s.length + 1;
        }
      }
      if (sbuf.length > 0) chunks.push(sbuf.join(' '));
      continue;
    }
    buf.push(para);
    bufLen += para.length + 2;
  }
  if (buf.length > 0) chunks.push(buf.join('\n\n'));
  return chunks;
}
