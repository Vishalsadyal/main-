'use client';
// The call outcome buttons. Each one writes its outcome into the form's hidden "outcome" field before
// submitting, so the server always knows which button was tapped.
import { CALL_OUTCOMES, type CallOutcome } from '@/lib/call-outcomes';

const TONE: Record<string, string> = {
  good: 'bg-green-600 text-white ring-green-600',
  neutral: 'bg-white text-slate-800 ring-slate-300',
  retry: 'bg-amber-50 text-amber-900 ring-amber-300',
  stop: 'bg-white text-slate-600 ring-slate-300',
};

export default function CallButtons({ laterChoice = true }: { laterChoice?: boolean }) {
  const pick = (k: CallOutcome) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const field = e.currentTarget.form?.elements.namedItem('outcome');
    if (field instanceof HTMLInputElement) field.value = k;
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="outcome" defaultValue="" />
      {(Object.entries(CALL_OUTCOMES) as [CallOutcome, (typeof CALL_OUTCOMES)[CallOutcome]][]).map(([k, o]) =>
        k === 'later' && laterChoice ? (
          <span key={k} className="flex items-center rounded-lg ring-1 ring-slate-300">
            <button type="submit" onClick={pick(k)} title={o.hint} className="rounded-l-lg bg-white px-3.5 py-2.5 text-sm font-semibold">{o.label}</button>
            <select name="later" defaultValue="1" aria-label="Call back when" className="rounded-r-lg border-l border-slate-300 bg-white px-2 py-2.5 text-sm">
              <option value="0">in 3 hours</option><option value="1">tomorrow</option><option value="2">in 2 days</option><option value="7">next week</option>
            </select>
          </span>
        ) : (
          <button key={k} type="submit" onClick={pick(k)} title={o.hint}
            className={`rounded-lg px-3.5 py-2.5 text-sm font-semibold ring-1 ${TONE[o.tone]}`}>{o.label}{k === 'later' ? ' (tomorrow)' : ''}</button>
        ),
      )}
    </div>
  );
}
