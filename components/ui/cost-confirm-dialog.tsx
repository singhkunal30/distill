'use client';

import * as React from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatUsd } from '@/lib/utils';

export type CostConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimatedUsd: number;
  demoMode: boolean;
  title: string;
  description?: string;
  detail?: React.ReactNode;
  confirmLabel?: string;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function CostConfirmDialog({
  open,
  onOpenChange,
  estimatedUsd,
  demoMode,
  title,
  description,
  detail,
  confirmLabel,
  pending,
  onConfirm,
}: CostConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            {title}
          </DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="space-y-3">
          {demoMode ? (
            <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
              <p className="font-medium">Demo mode is on — this job is free.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Distill will use the pre-cached fixture for this book. Toggle demo
                mode off in Settings to make a live AI call.
              </p>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted-foreground">Estimated cost</span>
                <span className="font-serif text-xl font-semibold">
                  {formatUsd(estimatedUsd)}
                </span>
              </div>
              {estimatedUsd >= 1 ? (
                <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-accent" />
                  <span>
                    This is a larger job. Actual cost may differ — the wrapper will
                    write the final amount to the API Usage log.
                  </span>
                </div>
              ) : null}
            </div>
          )}
          {detail ? <div className="text-sm text-muted-foreground">{detail}</div> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => void onConfirm()} disabled={pending} variant="accent">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel ?? (demoMode ? 'Run in demo mode' : 'Confirm & run')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
