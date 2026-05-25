// Open Library search + cover resolution. Public API, no key required.
// Docs: https://openlibrary.org/dev/docs/api/search

const SEARCH_URL = 'https://openlibrary.org/search.json';
const COVERS_URL = 'https://covers.openlibrary.org/b';

export type OLSearchHit = {
  key: string; // e.g. "/works/OL45883W"
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
  ebook_access?: string;
};

export type OLBook = {
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  publishedYear: number | null;
  pageCount: number | null;
  isbn: string | null;
  openLibraryId: string;
  subjects: string[];
};

export function coverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'L'): string {
  return `${COVERS_URL}/id/${coverId}-${size}.jpg`;
}

export async function searchBooks(query: string, limit = 12): Promise<OLBook[]> {
  if (!query.trim()) return [];
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set(
    'fields',
    'key,title,subtitle,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,subject',
  );

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Distill/0.1 (personal use)' },
    next: { revalidate: 60 * 60 * 24 }, // cache 1 day
  });
  if (!res.ok) throw new Error(`Open Library search failed: ${res.status}`);
  const data = (await res.json()) as { docs: OLSearchHit[] };

  return data.docs.slice(0, limit).map((hit) => ({
    title: hit.title,
    subtitle: hit.subtitle ?? null,
    authors: hit.author_name ?? [],
    coverUrl: hit.cover_i ? coverUrl(hit.cover_i, 'L') : null,
    publishedYear: hit.first_publish_year ?? null,
    pageCount: hit.number_of_pages_median ?? null,
    isbn: hit.isbn?.[0] ?? null,
    openLibraryId: hit.key,
    subjects: (hit.subject ?? []).slice(0, 8),
  }));
}

export async function getWork(workKey: string): Promise<{ description: string | null } | null> {
  const path = workKey.startsWith('/') ? workKey : `/works/${workKey}`;
  const res = await fetch(`https://openlibrary.org${path}.json`, {
    headers: { 'User-Agent': 'Distill/0.1 (personal use)' },
    next: { revalidate: 60 * 60 * 24 * 7 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { description?: string | { value: string } };
  const description =
    typeof data.description === 'string'
      ? data.description
      : data.description?.value ?? null;
  return { description };
}
