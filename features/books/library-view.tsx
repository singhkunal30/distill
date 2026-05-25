'use client';

import * as React from 'react';
import Fuse from 'fuse.js';
import { Filter, LayoutGrid, List, Search, SortAsc } from 'lucide-react';
import { BookCard } from './book-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STATUS_LABEL, type BookStatus } from './types';
import type { BookListItem } from './queries';
import { cn } from '@/lib/utils';

const STATUSES: BookStatus[] = ['reading', 'to_read', 'finished', 'archived'];
const SORTS = [
  { value: 'recent', label: 'Recently added' },
  { value: 'title', label: 'Title A→Z' },
  { value: 'author', label: 'Author' },
  { value: 'year', label: 'Year' },
  { value: 'rating', label: 'Rating' },
] as const;

type SortValue = (typeof SORTS)[number]['value'];

export function LibraryView({
  books,
  allGenres,
}: {
  books: BookListItem[];
  allGenres: string[];
}) {
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<Set<BookStatus>>(new Set());
  const [genreFilter, setGenreFilter] = React.useState<Set<string>>(new Set());
  const [sort, setSort] = React.useState<SortValue>('recent');
  const [view, setView] = React.useState<'grid' | 'list'>('grid');

  const fuse = React.useMemo(
    () =>
      new Fuse(books, {
        keys: ['title', 'subtitle', 'authors', 'genres'],
        threshold: 0.36,
        ignoreLocation: true,
      }),
    [books],
  );

  const filtered = React.useMemo(() => {
    let result = books;
    if (query.trim()) {
      result = fuse.search(query.trim()).map((r) => r.item);
    }
    if (statusFilter.size > 0) {
      result = result.filter((b) => statusFilter.has(b.status as BookStatus));
    }
    if (genreFilter.size > 0) {
      result = result.filter((b) => b.genres.some((g) => genreFilter.has(g)));
    }
    const sorted = [...result];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'author': {
          const aa = a.authors[0] ?? '';
          const bb = b.authors[0] ?? '';
          return aa.localeCompare(bb);
        }
        case 'year':
          return (b.publishedYear ?? 0) - (a.publishedYear ?? 0);
        case 'rating':
          return (b.rating ?? 0) - (a.rating ?? 0);
        case 'recent':
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });
    return sorted;
  }, [books, fuse, query, statusFilter, genreFilter, sort]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
                Filter
                {statusFilter.size + genreFilter.size > 0 ? (
                  <span className="ml-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {statusFilter.size + genreFilter.size}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              {STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={(checked) => {
                    setStatusFilter((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(s);
                      else next.delete(s);
                      return next;
                    });
                  }}
                >
                  {STATUS_LABEL[s]}
                </DropdownMenuCheckboxItem>
              ))}
              {allGenres.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Genre</DropdownMenuLabel>
                  <div className="max-h-60 overflow-y-auto scrollbar-thin">
                    {allGenres.map((g) => (
                      <DropdownMenuCheckboxItem
                        key={g}
                        checked={genreFilter.has(g)}
                        onCheckedChange={(checked) => {
                          setGenreFilter((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(g);
                            else next.delete(g);
                            return next;
                          });
                        }}
                      >
                        {g}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </div>
                </>
              ) : null}
              {statusFilter.size + genreFilter.size > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <button
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-secondary"
                    onClick={() => {
                      setStatusFilter(new Set());
                      setGenreFilter(new Set());
                    }}
                  >
                    Clear all filters
                  </button>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4" />
                {SORTS.find((s) => s.value === sort)?.label ?? 'Sort'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORTS.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s.value}
                  checked={sort === s.value}
                  onCheckedChange={() => setSort(s.value)}
                >
                  {s.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
            <button
              onClick={() => setView('grid')}
              className={cn(
                'rounded p-1.5',
                view === 'grid' ? 'bg-background shadow-sm' : 'text-muted-foreground',
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'rounded p-1.5',
                view === 'list' ? 'bg-background shadow-sm' : 'text-muted-foreground',
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {filtered.length} of {books.length} books
      </div>

      {filtered.length === 0 ? (
        <EmptyState query={query} />
      ) : view === 'grid' ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border bg-card">
          {filtered.map((book) => (
            <li key={book.id}>
              <a
                href={`/book/${book.id}`}
                className="flex items-center gap-4 p-3 hover:bg-muted/40"
              >
                <div className="w-12 shrink-0">
                  <div className="overflow-hidden rounded-sm">
                    <BookCardThumb book={book} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{book.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {book.authors.join(', ') || 'Unknown author'} ·{' '}
                    {STATUS_LABEL[book.status as keyof typeof STATUS_LABEL]}
                  </p>
                </div>
                {book.publishedYear ? (
                  <span className="text-xs text-muted-foreground">{book.publishedYear}</span>
                ) : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BookCardThumb({ book }: { book: BookListItem }) {
  // Lazy inline thumb without next/image overhead in list view.
  if (book.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={book.coverUrl} alt="" className="aspect-[2/3] w-full object-cover" />
    );
  }
  let hash = 0;
  for (let i = 0; i < book.title.length; i++) hash = (hash * 31 + book.title.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return (
    <div
      className="aspect-[2/3] w-full"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 40% 30%), hsl(${(hue + 40) % 360} 60% 45%))`,
      }}
    />
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="mt-12 flex flex-col items-center gap-2 rounded-lg border border-dashed bg-card/30 p-12 text-center">
      <p className="font-serif text-lg">No books match.</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {query
          ? `Nothing in your library matches "${query}". Try clearing filters.`
          : 'Your library is empty. Add a book to start distilling.'}
      </p>
    </div>
  );
}
