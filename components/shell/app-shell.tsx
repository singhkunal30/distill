'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Library,
  Settings,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { DistillWordmark } from '@/components/brand/wordmark';
import { AudioBar } from '@/features/audio/audio-bar';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/discover', label: 'Discover', icon: Sparkles },
  { href: '/stats', label: 'Stats', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card/40 backdrop-blur md:flex">
        <div className="flex h-16 items-center px-5">
          <Link href="/" aria-label="Distill home">
            <DistillWordmark />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t p-4 text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground">Distill</p>
          <p>A personal library, distilled.</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:hidden">
        <Link href="/" aria-label="Distill home">
          <DistillWordmark />
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>

      <main className="md:pl-60 pb-36 md:pb-20">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">
          {children}
        </div>
      </main>

      <AudioBar />

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-[10px] font-medium',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}
              aria-label={item.label}
            >
              <Icon className={cn('h-5 w-5', active && 'text-accent')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

