import Link from 'next/link';
import { requireLogin } from '@/lib/dashboard-auth';
import { CALL_OUTCOMES, callQueue, MAX_TRIES, type CallOutcome } from '@/lib/calls';
import { coldCallScript } from '@/lib/call-script';
import { getSettings, shortName } from '@/lib/outreach';
import { saveCall } from '../actions';
import CallButtons from '../CallButtons';

export const dynamic = 'force-dynamic';


export default async function CallsPage() {
  await requireLogin();
  const [{ leads, due, waiting, today }, settings] = await Promise.all([callQueue(25), getSettings()]);
  const made = Object.values(today).reduce((n, x) => n + x, 0);
  const picked = made - (today.no_answer || 0) - (today.busy || 0);
  const yes = (today.yes || 0) + (today.meeting || 0);

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold">📞 Calls today: {made}</h1>
          <span className="text-sm text-slate-500">{due.toLocaleString('en-IN')} to call now · {waiting.toLocaleString('en-IN')} call-backs later · no daily limit</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 font-semibold text-blue-800 ring-1 ring-blue-200">Picked up: {picked}</span>
          <span className="rounded-full bg-green-50 px-3 py-1.5 font-semibold text-green-800 ring-1 ring-green-200">Said yes: {yes}</span>
          <span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-800 ring-1 ring-amber-200">No answer: {(today.no_answer || 0) + (today.busy || 0)}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 ring-1 ring-slate-200">Not interested: {today.not_interested || 0}</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Call, use the script, write what they said, then tap what happened. <b>No answer</b> comes back tomorrow — after {MAX_TRIES} unanswered calls
          the lead is dropped. <b>✅ Send the sample</b> opens the lead with the “as discussed on the call” WhatsApp message ready.
          Best time for clinics: 11 AM–1 PM and 3–5 PM.
        </p>
      </section>

      {leads.length === 0 && (
        <p className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm ring-1 ring-slate-200">
          Nobody left to call right now{waiting ? ` — ${waiting} call-backs are scheduled for later` : ''}. Run a hunt with the extension for more leads.
        </p>
      )}

      {leads.map((l, i) => {
        const tries = Number(l.call_count || 0);
        const script = coldCallScript(l, settings);
        const tel = (l.phone || '').replace(/[^\d+]/g, '');
        return (
          <article key={l.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/dashboard/leads/${encodeURIComponent(l.id)}`} className="text-lg font-semibold hover:text-blue-700">{shortName(l.name)}</Link>
                <div className="text-sm text-slate-500">{[l.category_label, l.city, l.state].filter(Boolean).join(' · ')}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${tries ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>Call {tries + 1} of {MAX_TRIES}</span>
                  {l.call_result && l.call_result in CALL_OUTCOMES && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Last: {CALL_OUTCOMES[l.call_result as CallOutcome].label}</span>
                  )}
                  {l.status !== 'new' && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">Messaged before</span>}
                  {l.website ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">Has a website</span> : <span className="rounded-full bg-green-50 px-2.5 py-1 text-green-700">No website</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {l.rating ? <span className="font-semibold text-amber-700">★ {l.rating}{l.review_count ? ` (${Number(l.review_count).toLocaleString('en-IN')})` : ''}</span> : null}
                <span className={`rounded-full px-2.5 py-1 font-bold ${l.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{l.score ?? '—'}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <a href={`tel:${tel}`} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3.5 text-lg font-bold text-white hover:bg-green-700">
                📞 Call {l.phone}
              </a>
              {l.whatsapp && (
                <a href={l.whatsapp} target="_blank" rel="noopener" title="Opens their WhatsApp chat — tap the call icon there"
                  className="flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-base font-semibold text-green-800 ring-1 ring-green-300 hover:bg-green-50">
                  💬 WhatsApp
                </a>
              )}
            </div>

            <details className="mt-4 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200" open={i === 0}>
              <summary className="cursor-pointer text-sm font-semibold text-amber-900">🎙️ Your pitch — {shortName(l.name)}</summary>
              <div className="mt-3 flex flex-col gap-3">
                {script.map((sec) => (
                  <div key={sec.title}>
                    <div className="text-sm font-bold text-slate-800">{sec.title}</div>
                    <ul className="mt-1 flex flex-col gap-1">
                      {sec.lines.map((line) => <li key={line} className="text-[15px] leading-relaxed text-slate-700">{line}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </details>

            <form action={saveCall} className="mt-4 flex flex-col gap-3">
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="back" value="/dashboard/calls" />
              <textarea name="note" rows={2} maxLength={2000} placeholder="What did they say? (e.g. “send on WhatsApp”, “call after 5”, “has a nephew who makes websites”)"
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
              <CallButtons />
            </form>
          </article>
        );
      })}
    </div>
  );
}
