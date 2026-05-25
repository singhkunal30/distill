import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/settings';
import { Onboarding } from '@/features/onboarding/onboarding';

export default async function WelcomePage() {
  const settings = await getSettings();
  if (settings.onboardingCompleted) redirect('/');
  return <Onboarding />;
}
