import Image from 'next/image';
import { cn } from '@/lib/utils';

type Props = {
  url: string | null;
  title: string;
  className?: string;
  sizes?: string;
};

// Color-derived placeholder when there's no cover art. Keeps the
// library visually consistent for manual/text imports.
function bookGradient(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue} 40% 30%), hsl(${(hue + 40) % 360} 60% 45%))`;
}

export function BookCover({ url, title, className, sizes }: Props) {
  if (url) {
    return (
      <div
        className={cn(
          'relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted shadow-sm',
          className,
        )}
      >
        <Image
          src={url}
          alt={title}
          fill
          unoptimized
          sizes={sizes ?? '(min-width: 768px) 18vw, 40vw'}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        'relative aspect-[2/3] w-full overflow-hidden rounded-md shadow-sm',
        className,
      )}
      style={{ background: bookGradient(title) }}
    >
      <span className="absolute inset-0 flex items-center justify-center p-3 text-center font-serif text-sm font-semibold leading-tight text-white/95">
        {title}
      </span>
    </div>
  );
}
