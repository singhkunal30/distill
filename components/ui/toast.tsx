'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
};

type ToastContextValue = {
  push: (msg: Omit<ToastMessage, 'id'>) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const idRef = React.useRef(0);

  const push = React.useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { ...msg, id }]);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={5000}>
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            onOpenChange={(open) => !open && dismiss(t.id)}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border bg-card p-4 shadow-lg data-[state=open]:animate-fade-in',
              t.variant === 'destructive' && 'border-destructive/40',
              t.variant === 'success' && 'border-accent/40',
            )}
          >
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-semibold">
                {t.title}
              </ToastPrimitive.Title>
              {t.description ? (
                <ToastPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none sm:bottom-6 sm:right-6" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
