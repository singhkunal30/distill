'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import {
  importFromOpenLibrary,
  importFromUrl,
  importFromText,
  importFromPdf,
  importFromEpub,
  searchOpenLibrary,
} from './actions';
import type { OLBook } from '@/lib/openlibrary';

export function AddBookButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="default">
          <Plus className="h-4 w-4" />
          Add book
        </Button>
      </DialogTrigger>
      <AddBookContent onAdded={() => setOpen(false)} />
    </Dialog>
  );
}

function AddBookContent({ onAdded }: { onAdded: () => void }) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add a book</DialogTitle>
        <DialogDescription>
          Search Open Library, paste an article, upload a PDF/EPUB, or write your own.
        </DialogDescription>
      </DialogHeader>
      <Tabs defaultValue="search" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="text">Write</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>
        <TabsContent value="search">
          <OpenLibrarySearchPanel onAdded={onAdded} />
        </TabsContent>
        <TabsContent value="url">
          <UrlImportPanel onAdded={onAdded} />
        </TabsContent>
        <TabsContent value="upload">
          <UploadPanel onAdded={onAdded} />
        </TabsContent>
        <TabsContent value="text">
          <TextPanel onAdded={onAdded} />
        </TabsContent>
        <TabsContent value="manual">
          <ManualPanel onAdded={onAdded} />
        </TabsContent>
      </Tabs>
    </DialogContent>
  );
}

function useRefresh(onAdded: () => void) {
  const router = useRouter();
  const toast = useToast();
  return React.useCallback(
    (msg: string) => {
      toast.push({ title: msg, variant: 'success' });
      router.refresh();
      onAdded();
    },
    [router, toast, onAdded],
  );
}

function OpenLibrarySearchPanel({ onAdded }: { onAdded: () => void }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<OLBook[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [adding, setAdding] = React.useState<string | null>(null);
  const done = useRefresh(onAdded);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await searchOpenLibrary(query);
      setResults(res);
    } finally {
      setSearching(false);
    }
  };

  const add = async (book: OLBook) => {
    setAdding(book.openLibraryId);
    try {
      const fd = new FormData();
      fd.set('payload', JSON.stringify(book));
      await importFromOpenLibrary(fd);
      done(`Added “${book.title}”`);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, author, ISBN…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>
      <div className="max-h-[420px] space-y-2 overflow-y-auto scrollbar-thin">
        {results.length === 0 && !searching ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Type a title above to search the Open Library.
          </p>
        ) : null}
        {results.map((b) => (
          <div
            key={b.openLibraryId}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            {b.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.coverUrl}
                alt=""
                className="h-20 w-14 rounded object-cover shadow-sm"
              />
            ) : (
              <div className="h-20 w-14 rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{b.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {b.authors.join(', ') || 'Unknown author'}
                {b.publishedYear ? ` · ${b.publishedYear}` : ''}
              </p>
              {b.subjects.length > 0 ? (
                <p className="mt-1 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                  {b.subjects.slice(0, 3).join(' · ')}
                </p>
              ) : null}
            </div>
            <Button
              size="sm"
              onClick={() => add(b)}
              disabled={adding === b.openLibraryId}
            >
              {adding === b.openLibraryId ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                'Add'
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UrlImportPanel({ onAdded }: { onAdded: () => void }) {
  const [url, setUrl] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const done = useRefresh(onAdded);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set('url', url);
      await importFromUrl(fd);
      done('Article imported');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="url">Article URL</Label>
        <Input
          id="url"
          type="url"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Distill will fetch the page and extract its main content via Readability.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || !url.trim()} className="w-full sm:w-auto">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import article'}
      </Button>
    </form>
  );
}

function UploadPanel({ onAdded }: { onAdded: () => void }) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const done = useRefresh(onAdded);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const file = data.get('file');
    if (!(file instanceof File) || file.size === 0) return;
    setPending(true);
    setError(null);
    try {
      if (file.name.toLowerCase().endsWith('.pdf')) {
        await importFromPdf(data);
      } else if (file.name.toLowerCase().endsWith('.epub')) {
        await importFromEpub(data);
      } else {
        throw new Error('Only .pdf and .epub are supported here.');
      }
      done(`Imported “${file.name}”`);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="file">PDF or EPUB file</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.epub,application/pdf,application/epub+zip"
          required
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Up to 20 MB. Distill extracts the text in the browser-server boundary;
          no third-party services are called.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload & parse'}
      </Button>
    </form>
  );
}

function TextPanel({ onAdded }: { onAdded: () => void }) {
  const [pending, setPending] = React.useState(false);
  const [kind, setKind] = React.useState<'md' | 'txt'>('md');
  const done = useRefresh(onAdded);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      fd.set('kind', kind);
      await importFromText(fd);
      done('Note added to library');
      e.currentTarget.reset();
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" placeholder="The Beginning of Infinity" required />
        </div>
        <div>
          <Label htmlFor="authors">Authors</Label>
          <Input id="authors" name="authors" placeholder="David Deutsch" />
        </div>
      </div>
      <div>
        <Label htmlFor="body">Body</Label>
        <Textarea
          id="body"
          name="body"
          rows={10}
          placeholder="Paste markdown or plain text…"
          required
        />
        <div className="mt-1 flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={kind === 'md'}
              onChange={() => setKind('md')}
            />
            Markdown
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              checked={kind === 'txt'}
              onChange={() => setKind('txt')}
            />
            Plain text
          </label>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to library'}
      </Button>
    </form>
  );
}

function ManualPanel({ onAdded }: { onAdded: () => void }) {
  const [pending, setPending] = React.useState(false);
  const done = useRefresh(onAdded);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      const title = String(fd.get('title') ?? '');
      const authors = String(fd.get('authors') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const yearRaw = String(fd.get('year') ?? '');
      const year = yearRaw ? Number(yearRaw) : null;
      const { createBook } = await import('./actions');
      await createBook({
        title,
        authors,
        publishedYear: year,
        sourceType: 'manual',
        genres: [],
      });
      done(`Added “${title}”`);
      e.currentTarget.reset();
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="m-title">Title</Label>
          <Input id="m-title" name="title" required />
        </div>
        <div>
          <Label htmlFor="m-authors">Authors</Label>
          <Input id="m-authors" name="authors" placeholder="Comma-separated" />
        </div>
        <div>
          <Label htmlFor="m-year">Year</Label>
          <Input id="m-year" name="year" type="number" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
      </Button>
    </form>
  );
}
