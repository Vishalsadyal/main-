import { redirect } from 'next/navigation';
import { isLoggedIn, isSetUp } from '@/lib/dashboard-auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await isLoggedIn()) redirect('/dashboard');
  return (
    <div className="mx-auto mt-16 max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h1 className="text-lg font-semibold">Log in</h1>
      {isSetUp() ? (
        <LoginForm />
      ) : (
        <p className="mt-3 text-sm text-amber-700">
          The dashboard isn&apos;t set up yet: add <code>DASHBOARD_PASSWORD</code> and <code>DASHBOARD_SECRET</code> to the
          environment variables.
        </p>
      )}
    </div>
  );
}
