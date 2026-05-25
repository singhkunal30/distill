import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// Server component (no 'use client'). The icon prop is a component
// reference; that's fine in a server component but not as a prop sent
// across the server→client boundary — which is why this is split out
// of app-shell.tsx (which is a client component).
export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-foreground">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground text-balance">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
