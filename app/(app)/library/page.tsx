import { PageHeader } from '@/components/shell/page-header';
import { listBooks, listGenres } from '@/features/books/queries';
import { LibraryView } from '@/features/books/library-view';
import { AddBookButton } from '@/features/books/add-book-dialog';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  const [books, genres] = await Promise.all([listBooks(), listGenres()]);
  return (
    <div>
      <PageHeader
        title="Library"
        description="Every book you've added, indexed and ready to distill."
        actions={<AddBookButton />}
      />
      <LibraryView books={books} allGenres={genres.map((g) => g.name)} />
    </div>
  );
}
