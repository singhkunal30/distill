import { z } from 'zod';

export const BookStatus = z.enum(['to_read', 'reading', 'finished', 'archived']);
export type BookStatus = z.infer<typeof BookStatus>;

export const BookSourceType = z.enum([
  'manual',
  'txt',
  'md',
  'epub',
  'pdf',
  'url',
  'metadata-only',
]);
export type BookSourceType = z.infer<typeof BookSourceType>;

export const CreateBookInput = z.object({
  title: z.string().min(1, 'Title required').max(300),
  subtitle: z.string().max(300).optional().nullable(),
  authors: z.array(z.string().min(1)).default([]),
  coverUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  publishedYear: z.number().int().min(-3000).max(3000).optional().nullable(),
  pageCount: z.number().int().positive().optional().nullable(),
  isbn: z.string().max(20).optional().nullable(),
  openLibraryId: z.string().max(120).optional().nullable(),
  genres: z.array(z.string()).default([]),
  status: BookStatus.default('to_read'),
  sourceType: BookSourceType.default('metadata-only'),
  contentMd: z.string().optional().nullable(),
});
export type CreateBookInput = z.infer<typeof CreateBookInput>;

export const UpdateBookInput = z.object({
  id: z.string(),
  title: z.string().min(1).max(300).optional(),
  subtitle: z.string().max(300).optional().nullable(),
  authors: z.array(z.string()).optional(),
  coverUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  publishedYear: z.number().int().optional().nullable(),
  pageCount: z.number().int().optional().nullable(),
  isbn: z.string().optional().nullable(),
  genres: z.array(z.string()).optional(),
  status: BookStatus.optional(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
});
export type UpdateBookInput = z.infer<typeof UpdateBookInput>;

export const STATUS_LABEL: Record<BookStatus, string> = {
  to_read: 'To read',
  reading: 'Reading',
  finished: 'Finished',
  archived: 'Archived',
};

export const SOURCE_LABEL: Record<BookSourceType, string> = {
  manual: 'Manual',
  txt: 'Text',
  md: 'Markdown',
  epub: 'EPUB',
  pdf: 'PDF',
  url: 'Article',
  'metadata-only': 'Metadata',
};
