import Link from 'next/link';
import { requireLogin } from '@/lib/dashboard-auth';
import { getDesign } from '@/lib/demo-library';
import { actionList, mostEngaged, shortName, todayList } from '@/lib/outreach';
import { StatusBadge } from '../StatusBadge';

export const dynamic = 'force-dynamic';

export default async function ActionsPage() {
  await requireLogin();
  const [items, today] = await Promise.all([actionList(), todayList()]);
  const urgent = items.filter((i) => i.action.urgent).length;
  const toSendToday = Math.max(0, Math.min(today.limit - today.sent, today.available));

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div>
          <h1 className="text-xl font-bold">🔥 Action required</h1>
          <p className="text-sm text-slate-600">
            {items.length ? `${items.length} lead${items.length === 1 ? '' : 's'} need you${urgent ? ` · ${urgent} urgent (replied or opened a design)` : ''}.` : 'Nothing waiting — nice.'}
          </p>
        </div>
        {toSendToday > 0 && (
          <Link href="/dashboard/today" className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white">Send today&apos;s {toSendToday} first messages →</Link>
        )}
      </section>

      {items.length > 0 && (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Client</th><th className="px-3 py-3">Situation</th><th className="px-3 py-3">Recommended action</th><th className="px-3 py-3" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(({ lead, action, e }) => {
                const best = mostEngaged(e);
                return (
                  <tr key={lead.id} className={action.urgent ? 'bg-amber-50/40' : ''}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{action.urgent ? '🔥 ' : ''}{shortName(lead.name)}</div>
                      <div className="text-xs text-slate-500">{[lead.city, lead.phone].filter(Boolean).join(' · ')}</div>
                      <div className="mt-1"><StatusBadge status={lead.status} /></div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {action.situation}
                      {best && !action.situation.includes('Opened') && (
                        <div className="text-xs text-green-700">Most engaged: {getDesign(best.design)?.name || best.design} ({best.e.views}×)</div>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold">{action.title}</td>
                    <td className="px-3 py-3 text-right">
                      <Link href={`/dashboard/leads/${encodeURIComponent(lead.id)}#next`}
                        className="inline-block whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white">Do it →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
