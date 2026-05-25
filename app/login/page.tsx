import { redirect } from 'next/navigation';
import { isAuthenticated, passcodeEnabled } from '@/lib/auth';
import { LoginForm } from '@/features/auth/login-form';
import { DistillMark } from '@/components/brand/wordmark';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  if (!passcodeEnabled()) redirect('/');
  if (await isAuthenticated()) redirect(searchParams.next ?? '/');

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <DistillMark className="h-6 w-6 text-primary" />
          <span className="font-serif text-lg font-semibold">Distill</span>
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your passcode to continue.
        </p>
        <LoginForm next={searchParams.next ?? '/'} />
      </div>
    </div>
  );
}
