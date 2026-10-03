import Link from 'next/link';
import { requireLogin } from '@/lib/dashboard-auth';
import { facets, isConfigured, LEAD_STATUSES, type LeadFilters, listLeads, stats } from '@/lib/leads-db';
import { StatusBadge } from './StatusBadge';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireLogin();
  if (!isConfigured()) {
    return (
      <p className="rounded-lg bg-amber-50 p-4 text-amber-800 ring-1 ring-amber-200">
        The leads database isn&apos;t connected: add <code>LEADS_DB_URL</code> and <code>LEADS_DB_TOKEN</code> (Turso) to the
        environment variables.
      </p>
    );
  }
  const sp = await searchParams;
  const filters: LeadFilters = {
    q: one(sp.q), status: one(sp.status), city: one(sp.city), category: one(sp.category), priority: one(sp.priority),
    website: one(sp.website), archived: one(sp.archived), sort: one(sp.sort), page: Number(one(sp.page)) || 1,
  };
  const [{ rows, total, page, pages }, s, f] = await Promise.all([listLeads(filters), stats(), facets()]);
  const query = (changes: Record<string, string | number>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...changes })) if (v) p.set(k, String(v));
    return `/dashboard?${p.toString()}`;
  };
  const cards: [string, number, Record<string, string>][] = [
    ['All leads', s.total, {}],
    ['No website', s.noWebsite, { website: 'none' }],
    ['High priority', s.high, { priority: 'high' }],
    ['Waiting for reply', s.waiting, { status: 'waiting_reply' }],
    ['Replied', s.replied, { status: 'replied' }],
    ['Won', s.won, { status: 'won' }],
  ];
  const input = 'rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm';

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(([label, value, link]) => (
          <Link key={label} href={`/dashboard?${new URLSearchParams(link).toString()}`}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value.toLocaleString('en-IN')}</div>
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
        <input name="q" defaultValue={filters.q} placeholder="Search name, phone, city…" className={`${input} min-w-52 flex-1`} />
        <select name="status" defaultValue={filters.status} className={input}>
          <option value="">Any status</option>
          {Object.entries(LEAD_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="city" defaultValue={filters.city} className={input}>
          <option value="">Any city</option>
          {f.cities.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="category" defaultValue={filters.category} className={input}>
          <option value="">Any business type</option>
          {f.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select name="priority" defaultValue={filters.priority} className={input}>
          <option value="">Any priority</option>
          <option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option>
        </select>
        <select name="website" defaultValue={filters.website} className={input}>
          <option value="">Website: any</option><option value="none">No website</option><option value="has">Has website</option>
        </select>
        <select name="sort" defaultValue={filters.sort} className={input}>
          <option value="score">Best first</option><option value="newest">Newest</option>
          <option value="updated">Recently updated</option><option value="name">Name</option>
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" name="archived" value="1" defaultChecked={filters.archived === '1'} /> Archived
        </label>
        <button className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700">Filter</button>
        <Link href="/dashboard" className="px-2 py-1.5 text-sm text-slate-500 hover:text-slate-800">Clear</Link>
        <a href={`/dashboard/export?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString()}`}
          className="ml-auto rounded-md px-3 py-1.5 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">Download CSV</a>
      </form>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-4 py-2 text-sm text-slate-500">
          {total.toLocaleString('en-IN')} lead{total === 1 ? '' : 's'}{filters.archived === '1' ? ' (archived)' : ''}
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No leads here yet. Leads arrive from the W3Tech Outreach Ext as it finds them.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-2">Business</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Rating</th>
                <th className="px-3 py-2">Phone</th><th className="px-3 py-2">Website</th><th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Found</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/dashboard/leads/${encodeURIComponent(l.id)}`} className="font-semibold text-slate-900 hover:text-blue-700">{l.name}</Link>
                    <div className="text-xs text-slate-500">{[l.category_label, l.city, l.state].filter(Boolean).join(' · ')}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${l.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{l.score ?? '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-amber-700">{l.rating ? `★ ${l.rating}${l.review_count ? ` (${Number(l.review_count).toLocaleString('en-IN')})` : ''}` : <span className="text-slate-300">—</span>}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {l.phone || '—'}
                    {l.whatsapp && <a href={l.whatsapp} target="_blank" rel="noopener" className="ml-2 text-xs font-semibold text-green-700">WA ↗</a>}
                  </td>
                  <td className="px-3 py-2.5">{l.website ? <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700">{hostOf(l.website)}</a> : <span className="text-amber-700">None</span>}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={l.status} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-500">{shortDate(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm">
            {page > 1 ? <Link href={query({ page: page - 1 })} className="text-blue-700">← Previous</Link> : <span />}
            <span className="text-slate-500">Page {page} of {pages}</span>
            {page < pages ? <Link href={query({ page: page + 1 })} className="text-blue-700">Next →</Link> : <span />}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500">Leads are never deleted — archive the ones you don&apos;t want to see. Every change is kept in each lead&apos;s history.</p>
    </div>
  );
}

function hostOf(url: string) {
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, '').slice(0, 28);
  } catch {
    return url.slice(0, 28);
  }
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
}
