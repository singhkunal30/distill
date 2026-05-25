import { redirect } from 'next/navigation';
import { AppShell } from '@/components/shell/app-shell';
import { getSettings } from '@/lib/settings';
import { ensureWorkerStarted } from '@/lib/jobs/boot';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  ensureWorkerStarted();
  const settings = await getSettings();
  if (!settings.onboardingCompleted) {
    redirect('/welcome');
  }
  return <AppShell>{children}</AppShell>;
}
