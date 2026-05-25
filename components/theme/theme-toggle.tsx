'use client';

import { Monitor, Moon, Sun, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'sepia' | 'system';

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'sepia');
  if (theme === 'system') {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) root.classList.add('dark');
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'sepia') {
    root.classList.add('sepia');
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = (localStorage.getItem('distill_theme') as Theme | null) ?? 'system';
    setTheme(stored);
  }, []);

  const choose = (next: Theme) => {
    setTheme(next);
    localStorage.setItem('distill_theme', next);
    applyTheme(next);
  };

  const opts: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'sepia', icon: BookOpen, label: 'Sepia' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];

  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-1">
      {opts.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors',
              theme === o.value
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            aria-pressed={theme === o.value}
          >
            <Icon className="h-3.5 w-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
