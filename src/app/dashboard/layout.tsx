import type { Metadata } from 'next';
import Link from 'next/link';
import { isLoggedIn } from '@/lib/dashboard-auth';
import { logout } from './actions';
import './dashboard.css';

export const metadata: Metadata = {
  title: 'Leads dashboard · W3Tech',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const loggedIn = await isLoggedIn();
  return (
    <div className="dash min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold">W3</span>
            Leads dashboard
          </Link>
          {loggedIn && (
            <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm font-semibold">
              {[['/dashboard/actions', '🔥 Actions'], ['/dashboard/today', 'Today'], ['/dashboard/replied', 'Replied'], ['/dashboard', 'Leads'], ['/dashboard/demos', 'Demos'], ['/dashboard/settings', 'Settings']].map(([href, label]) => (
                <Link key={href} href={href} className="rounded-md px-3.5 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">{label}</Link>
              ))}
            </nav>
          )}
          {loggedIn && (
            <form action={logout}>
              <button className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">Log out</button>
            </form>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
