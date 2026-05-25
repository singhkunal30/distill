import Link from 'next/link';
import { BookCover } from './book-cover';
import type { BookListItem } from './queries';
import { Badge } from '@/components/ui/badge';
import { STATUS_LABEL } from './types';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, string> = {
  to_read: 'bg-muted text-muted-foreground',
  reading: 'bg-accent/20 text-accent-foreground border border-accent/40',
  finished: 'bg-primary/15 text-primary border border-primary/30',
  archived: 'bg-muted/60 text-muted-foreground',
};

export function BookCard({ book }: { book: BookListItem }) {
  return (
    <Link
      href={`/book/${book.id}`}
      className="group flex flex-col gap-2 rounded-lg p-2 transition-colors hover:bg-muted/40"
    >
      <BookCover url={book.coverUrl} title={book.title} />
      <div className="px-1">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:underline">
          {book.title}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {book.authors.length > 0 ? book.authors.join(', ') : 'Unknown author'}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
              STATUS_BADGE[book.status] ?? STATUS_BADGE['to_read'],
            )}
          >
            {STATUS_LABEL[book.status as keyof typeof STATUS_LABEL] ?? book.status}
          </span>
          {book.rating ? (
            <Badge variant="muted" className="text-[10px]">
              {'★'.repeat(book.rating)}
            </Badge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
