'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { relativeTime } from '@/lib/utils';
import { restoreVersion } from './actions';

type Version = { id: string; reason: string | null; createdAt: Date };

export function VersionHistorySheet({
  versions,
  bookId,
  children,
}: {
  versions: Version[];
  bookId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const restore = async (versionId: string) => {
    setPendingId(versionId);
    try {
      await restoreVersion({ versionId });
      toast.push({ title: 'Restored.', variant: 'success' });
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.push({
        title: 'Could not restore',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Every regeneration or manual edit saves the previous state — restore any.
          </DialogDescription>
        </DialogHeader>
        {versions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No prior versions yet.
          </p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto scrollbar-thin">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{v.reason ?? 'Snapshot'}</p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTime(v.createdAt)} · {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => restore(v.id)}
                  disabled={pendingId === v.id}
                >
                  {pendingId === v.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">Book id: {bookId}</p>
      </DialogContent>
    </Dialog>
  );
}
