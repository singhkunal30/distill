import { cn } from '@/lib/utils';

// A stylised "D" droplet — the brand mark. Inline SVG so it lives in the
// bundle and tints with currentColor.
export function DistillMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <path
        d="M16 3c5.5 7.5 9 11.5 9 16a9 9 0 1 1-18 0c0-4.5 3.5-8.5 9-16z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M16 3c5.5 7.5 9 11.5 9 16a9 9 0 1 1-18 0c0-4.5 3.5-8.5 9-16z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 13.5v9.2c4 0 6-2 6-5.1 0-2.7-1.6-4.1-6-4.1z"
        fill="currentColor"
      />
    </svg>
  );
}

export function DistillWordmark({
  className,
  showTagline,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DistillMark className="h-7 w-7 text-primary" />
      <div className="flex flex-col leading-none">
        <span className="font-serif text-lg font-semibold tracking-tight">Distill</span>
        {showTagline ? (
          <span className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            The essence of every book.
          </span>
        ) : null}
      </div>
    </div>
  );
}
