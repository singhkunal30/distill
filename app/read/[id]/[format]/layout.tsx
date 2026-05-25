import { ensureWorkerStarted } from '@/lib/jobs/boot';
import { AudioBar } from '@/features/audio/audio-bar';

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  ensureWorkerStarted();
  return (
    <>
      {children}
      <AudioBar />
    </>
  );
}
