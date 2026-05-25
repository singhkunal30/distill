import { ensureWorkerStarted } from '@/lib/jobs/boot';

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  ensureWorkerStarted();
  return children;
}
