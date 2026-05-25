import { readFile } from 'fs/promises';
import path from 'path';

export type BookFixture = {
  bookId: string;
  title: string;
  blink: { heading: string; body: string }[];
  insights: string[];
  applications: string[];
  highlights: string[];
  flashcards: { front: string; back: string }[];
};

const FIXTURES_DIR = path.join(process.cwd(), 'lib', 'demo', 'fixtures');

export async function loadFixture(bookId: string): Promise<BookFixture | null> {
  try {
    const raw = await readFile(path.join(FIXTURES_DIR, `${bookId}.json`), 'utf-8');
    return JSON.parse(raw) as BookFixture;
  } catch {
    return null;
  }
}
