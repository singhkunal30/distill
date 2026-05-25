'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setBookStatus } from './actions';
import { STATUS_LABEL, type BookStatus } from './types';

const ORDER: BookStatus[] = ['to_read', 'reading', 'finished', 'archived'];

export function BookStatusControl({
  id,
  status,
}: {
  id: string;
  status: BookStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [current, setCurrent] = React.useState(status);

  const update = (next: BookStatus) => {
    setCurrent(next);
    startTransition(async () => {
      await setBookStatus(id, next);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" disabled={pending}>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {STATUS_LABEL[current]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ORDER.map((s) => (
          <DropdownMenuItem key={s} onSelect={() => update(s)}>
            <span className="flex w-4 items-center justify-center">
              {s === current ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            {STATUS_LABEL[s]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
