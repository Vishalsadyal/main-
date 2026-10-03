import Link from 'next/link';
import { requireLogin } from '@/lib/dashboard-auth';
import { competitors, getSettings, shortName, todayList } from '@/lib/outreach';
import MessageCard from '../MessageCard';
import { skipLead } from '../actions';
import { cardFor } from '../card';

export const dynamic = 'force-dynamic';

export default async function TodayPage() {
  await requireLogin();
  const [{ leads, sent, limit, available }, settings] = await Promise.all([todayList(), getSettings()]);
  const pct = limit ? Math.min(100, Math.round((sent / limit) * 100)) : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold">Today: {sent} of {limit} first messages sent</h1>
          <span className="text-sm text-slate-500">{available.toLocaleString('en-IN')} good leads waiting · best score first</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${pct}%` }} /></div>
        <p className="mt-3 text-sm text-slate-600">
          Pick the design(s), check the message, tap <b>Open WhatsApp</b> (one WhatsApp Web tab, text filled in), press send
          there, then <b>✓ Sent</b> here. Follow-ups come back on <Link href="/dashboard/actions" className="text-blue-700">Action required</Link> by themselves.
        </p>
      </section>

      {leads.length === 0 && (
        <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
          {sent >= limit ? 'Daily limit reached — well done! More tomorrow.' : 'No good leads with a WhatsApp number waiting. Run a hunt with the extension.'}
        </p>
      )}

      {leads.map((l) => {
        const c = competitors(l);
        const withSite = [...c.top, ...c.nearby].filter((x) => Boolean(x.website));
        const { options, designs } = cardFor(l, settings, ['first']);
        return (
          <article key={l.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/dashboard/leads/${encodeURIComponent(l.id)}`} className="text-lg font-semibold hover:text-blue-700">{shortName(l.name)}</Link>
                <div className="text-sm text-slate-500">{[l.category_label, l.city, l.phone].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {l.rating ? <span className="font-semibold text-amber-700">★ {l.rating}{l.review_count ? ` (${Number(l.review_count).toLocaleString('en-IN')})` : ''}</span> : null}
                {l.search_rank ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">#{l.search_rank} in search</span> : null}
                <span className={`rounded-full px-2.5 py-1 font-bold ${l.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{l.score}</span>
              </div>
            </div>
            {withSite.length > 0 && (
              <p className="mt-2 text-sm text-slate-600">
                Competitors with a website: {withSite.slice(0, 3).map((x) => `${shortName(x.name)}${x.rank && x.rank <= 3 ? ` (#${x.rank})` : x.km != null ? ` (${x.km} km)` : ''}`).join(', ')}
              </p>
            )}
            <div className="mt-4">
              <MessageCard id={l.id} phone={l.whatsapp} options={options} initialKind="first" designs={designs} />
            </div>
            <form action={skipLead} className="mt-2">
              <input type="hidden" name="id" value={l.id} />
              <button className="text-sm text-slate-500 hover:text-slate-800">Skip this lead</button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
