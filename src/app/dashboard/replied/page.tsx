import Link from 'next/link';
import { requireLogin } from '@/lib/dashboard-auth';
import { funnel, getSettings, INTENTS, repliedLeads, shortName, waitingForReply } from '@/lib/outreach';
import { StatusBadge } from '../StatusBadge';
import { saveReply } from '../actions';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;

export default async function RepliedPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireLogin();
  const sp = await searchParams;
  const q = String(Array.isArray(sp.q) ? sp.q[0] : sp.q || '').trim();
  const [steps, waiting, settings, replied] = await Promise.all([funnel(), waitingForReply(q), getSettings(), repliedLeads()]);
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const top = Math.max(1, steps[0].count);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-bold">Funnel</h1>
        <div className="mt-4 flex flex-col gap-2.5">
          {steps.map((s) => (
            <div key={s.status} className="grid grid-cols-[130px_1fr_60px] items-center gap-3 text-sm">
              <span className="font-medium text-slate-600">{s.label}</span>
              <span className="h-4 overflow-hidden rounded-full bg-slate-100">
                <span className={`block h-full rounded-full ${s.status === 'won' ? 'bg-green-600' : ['not_interested', 'nurture', 'no_reply'].includes(s.status) ? 'bg-slate-300' : 'bg-blue-600'}`}
                  style={{ width: `${Math.max(2, Math.round((s.count / top) * 100))}%` }} />
              </span>
              <b className="text-right">{s.count.toLocaleString('en-IN')}</b>
            </div>
          ))}
        </div>
        {!settings.price && <p className="mt-4 text-sm text-amber-700">Set your website price in <Link href="/dashboard/settings" className="underline">Settings</Link> — it goes into the pricing message.</p>}
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Replied <span className="text-sm font-normal text-slate-500">{replied.length}</span></h2>
        {!replied.length && <p className="mt-2 text-sm text-slate-500">No replies yet. When someone answers on WhatsApp, add it below.</p>}
        <div className="mt-3 flex flex-col divide-y divide-slate-100">
          {replied.map(({ lead: l, action }) => (
            <div key={l.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/leads/${encodeURIComponent(l.id)}`} className="font-semibold hover:text-blue-700">{shortName(l.name)}</Link>
                  <StatusBadge status={l.status} />
                  {l.intent && INTENTS[l.intent] && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{INTENTS[l.intent].label}</span>}
                </div>
                {l.last_reply ? (
                  <p className="mt-1 text-sm text-slate-700">“{l.last_reply.slice(0, 220)}”</p>
                ) : (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-sm text-amber-700">Their message isn&apos;t saved yet — add it</summary>
                    <form action={saveReply} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="back" value={`/dashboard/leads/${encodeURIComponent(l.id)}#next`} />
                      <textarea name="reply" rows={2} required placeholder="Paste what they replied…" className="rounded-lg border border-slate-300 px-3 py-2 text-base" />
                      <button className="self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Save reply → next step</button>
                    </form>
                  </details>
                )}
                <p className="text-xs text-slate-500">{[l.city, l.phone, when(l.last_reply_at)].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {action ? <span className="text-sm font-semibold">{action.urgent ? '🔥 ' : ''}{action.title}</span> : <span className="text-sm text-slate-400">Nothing due</span>}
                <Link href={`/dashboard/leads/${encodeURIComponent(l.id)}#next`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Do it →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Who replied?</h2>
        <p className="text-sm text-slate-500">Find the lead who answered on WhatsApp and paste what they said. The dashboard works out what they want
          (price, call, changes…), stops their follow-ups and puts the right next step on <Link href="/dashboard/actions" className="text-blue-700">Action required</Link>.</p>
        <form className="mt-3 flex gap-2">
          <input name="q" defaultValue={q} placeholder="Search name, city or phone…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
          <button className="rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white">Find</button>
        </form>
        <div className="mt-3 flex flex-col divide-y divide-slate-100">
          {waiting.map((l) => (
            <details key={l.id} className="py-2">
              <summary className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
                <span><b>{shortName(l.name)}</b> <span className="text-sm text-slate-500">{[l.city, l.phone].filter(Boolean).join(' · ')}</span></span>
                <span className="text-sm text-blue-700">They replied →</span>
              </summary>
              <form action={saveReply} className="mt-2 flex flex-col gap-2">
                <input type="hidden" name="id" value={l.id} />
                <input type="hidden" name="back" value={`/dashboard/leads/${encodeURIComponent(l.id)}#next`} />
                <textarea name="reply" rows={3} required placeholder="Paste their reply…" className="rounded-lg border border-slate-300 px-3 py-2 text-base" />
                <div className="flex flex-wrap items-center gap-2">
                  <select name="intent" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                    <option value="">Detect what they want</option>
                    {Object.entries(INTENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white">Save reply → next step</button>
                </div>
              </form>
            </details>
          ))}
          {!waiting.length && <p className="py-3 text-sm text-slate-500">{q ? 'No one waiting matches that.' : 'Nobody is waiting for a reply.'}</p>}
        </div>
      </section>
    </div>
  );
}
