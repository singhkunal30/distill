'use client';

import * as React from 'react';
import { Maximize2, Minimize2, Minus, Moon, Plus, Sun, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'sepia';

type ReaderState = {
  fontScale: number;
  fontFamily: 'serif' | 'sans';
  theme: Theme;
  zen: boolean;
};

const STORAGE_KEY = 'distill_reader_state';

const DEFAULTS: ReaderState = {
  fontScale: 1,
  fontFamily: 'serif',
  theme: 'sepia',
  zen: false,
};

const ReaderContext = React.createContext<{
  state: ReaderState;
  update: (patch: Partial<ReaderState>) => void;
} | null>(null);

export function ReaderProvider({
  initial,
  children,
}: {
  initial?: Partial<ReaderState>;
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<ReaderState>(() => ({ ...DEFAULTS, ...initial }));

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ReaderState>;
        setState((s) => ({ ...s, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  React.useEffect(() => {
    applyTheme(state.theme);
    return () => applyTheme(restorePreferredTheme());
  }, [state.theme]);

  const update = React.useCallback((patch: Partial<ReaderState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ReaderContext.Provider value={{ state, update }}>{children}</ReaderContext.Provider>
  );
}

export function useReader() {
  const ctx = React.useContext(ReaderContext);
  if (!ctx) throw new Error('useReader must be used within ReaderProvider');
  return ctx;
}

export function ReaderControls() {
  const { state, update } = useReader();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).closest('input, textarea')) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        update({ fontScale: Math.min(1.5, +(state.fontScale + 0.05).toFixed(2)) });
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        update({ fontScale: Math.max(0.85, +(state.fontScale - 0.05).toFixed(2)) });
      }
      if (e.key === 'z') {
        e.preventDefault();
        update({ zen: !state.zen });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, update]);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => update({ fontScale: Math.max(0.85, +(state.fontScale - 0.05).toFixed(2)) })}
        aria-label="Smaller text"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-10 text-center text-xs text-muted-foreground">
        {Math.round(state.fontScale * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => update({ fontScale: Math.min(1.5, +(state.fontScale + 0.05).toFixed(2)) })}
        aria-label="Larger text"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Font and theme">
            <Type className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 p-2">
          <DropdownMenuLabel>Font</DropdownMenuLabel>
          <div className="mb-2 grid grid-cols-2 gap-1">
            {(['serif', 'sans'] as const).map((f) => (
              <button
                key={f}
                onClick={() => update({ fontFamily: f })}
                className={cn(
                  'rounded px-2 py-1 text-xs',
                  state.fontFamily === f ? 'bg-secondary' : 'text-muted-foreground',
                )}
              >
                {f === 'serif' ? 'Serif' : 'Sans'}
              </button>
            ))}
          </div>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1">
            {(['light', 'sepia', 'dark'] as const).map((t) => {
              const Icon = t === 'dark' ? Moon : t === 'sepia' ? Type : Sun;
              return (
                <button
                  key={t}
                  onClick={() => update({ theme: t })}
                  className={cn(
                    'flex items-center justify-center gap-1 rounded px-2 py-1 text-xs',
                    state.theme === t ? 'bg-secondary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {t === 'sepia' ? 'Sepia' : t === 'light' ? 'Light' : 'Dark'}
                </button>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => update({ zen: !state.zen })}
        aria-label={state.zen ? 'Exit zen mode' : 'Zen mode'}
      >
        {state.zen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function applyTheme(t: Theme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'sepia');
  if (t === 'dark') root.classList.add('dark');
  else if (t === 'sepia') root.classList.add('sepia');
}

function restorePreferredTheme(): Theme {
  try {
    const stored = localStorage.getItem('distill_theme');
    if (stored === 'dark' || stored === 'sepia' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}
