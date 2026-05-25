import 'server-only';
import { startWorker } from './runner';

// Singleton boot. Triggered from the (app) layout, which is always
// rendered in the Node runtime. Using globalThis so dev-mode HMR
// doesn't spawn a second worker.

declare global {
  // eslint-disable-next-line no-var
  var __distill_worker_started__: boolean | undefined;
}

export function ensureWorkerStarted(): void {
  if (globalThis.__distill_worker_started__) return;
  globalThis.__distill_worker_started__ = true;
  void startWorker();
}
