import { requireLogin } from '@/lib/dashboard-auth';
import { DEFAULT_SETTINGS, getSettings, type MessageKind, MESSAGES } from '@/lib/outreach';
import { lastBackup, sheetConfigured } from '@/lib/sheet-backup';
import { backupNow, resetTexts, saveSettingsAction } from '../actions';

export const dynamic = 'force-dynamic';

type Search = Record<string, string | string[] | undefined>;

const PLACEHOLDERS = '{name} {city} {area} {in_city} {pitch} {competitor_line} {competitor_links} {design_links} {demo_link} {price} {starter_price} {my_name} {open_line}';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireLogin();
  const sp = await searchParams;
  const [s, backup] = await Promise.all([getSettings(), lastBackup()]);
  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-normal';
  const label = 'flex flex-col gap-1.5 text-sm font-semibold text-slate-700';
  const texts = Object.keys(MESSAGES) as MessageKind[];
  const field = (key: keyof typeof DEFAULT_SETTINGS, title: string, type = 'text', extra = {}) => (
    <label className={label}>{title}<input name={key} type={type} defaultValue={s[key]} className={input} {...extra} /></label>
  );

  return (
    <div className="flex flex-col gap-5">
      {sp.saved && <p className="rounded-lg bg-green-50 p-3 text-green-800 ring-1 ring-green-200">Settings saved.</p>}
      {sp.backup && (
        <p className={`rounded-lg p-3 ring-1 ${sp.backup === 'ok' ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-red-50 text-red-800 ring-red-200'}`}>
          {sp.backup === 'ok' ? `Backed up: ${backup?.leads ?? 0} leads and ${backup?.messages ?? 0} messages sent to the Sheet.` : `Backup failed: ${backup?.error || 'unknown error'}`}
        </p>
      )}

      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-semibold">Google Sheet backup</h2>
        <p className="mt-1 text-sm text-slate-600">
          Every lead (one row each, updated in place — never duplicated) and every WhatsApp message is copied to the
          Sheet&apos;s <b>Hunt Leads</b> and <b>Messages</b> tabs, automatically after each change.
        </p>
        {sheetConfigured() ? (
          <p className="mt-2 text-sm text-slate-600">
            Last backup: {backup ? `${new Date(backup.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} — ${backup.ok ? `${backup.leads} leads, ${backup.messages} messages` : `failed: ${backup.error}`}` : 'never'}
          </p>
        ) : (
          <p className="mt-2 text-sm text-amber-700">Not set up: add <code>SHEETS_API_KEY</code> (and <code>SHEETS_API_URL</code>, or the existing <code>DEMO_SHEETS_URL</code>) to the environment variables.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          <form action={backupNow}><button disabled={!sheetConfigured()} className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">Back up now</button></form>
          <form action={backupNow}><input type="hidden" name="full" value="1" />
            <button disabled={!sheetConfigured()} className="rounded-lg px-5 py-2.5 font-semibold ring-1 ring-slate-300 disabled:opacity-50">Re-send everything</button></form>
        </div>
      </section>

      <form action={saveSettingsAction} className="flex flex-col gap-5">
        <section className="grid gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2">
          <h2 className="text-lg font-semibold sm:col-span-2">Sending &amp; follow-ups</h2>
          {field('dailySend', 'First messages per day', 'number', { min: 1, max: 200 })}
          {field('minScore', "Minimum score for Today's list", 'number', { min: 0, max: 100 })}
          {field('price', 'Your website price ({price})', 'text', { placeholder: 'e.g. ₹14,999' })}
          {field('starterPrice', 'Budget price for the final follow-up ({starter_price}) — empty = same as price', 'text', { placeholder: 'e.g. ₹5,999' })}
          {field('myName', 'Your name / business ({my_name})')}
          <div className="sm:col-span-2">{field('openLine', '“Feel free to talk” line ({open_line}) — used in most messages')}</div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">Follow-up plan</h2>
          <p className="text-sm text-slate-600">How many days to wait before each next message. 0 = skip that message. When the plan runs out
            without a reply, the lead is closed as <b>“Closed — no reply”</b> and leaves your lists — no more time spent on it.
            A reply (or opening a design again) brings it back.</p>
          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="mb-3 text-sm font-semibold text-slate-700">They haven&apos;t replied</div>
            <div className="grid gap-3 sm:grid-cols-4">
              {field('fu1Days', 'First → follow-up 1 (days)', 'number', { min: 0, max: 60 })}
              {field('fu2Days', 'Follow-up 1 → 2 (days)', 'number', { min: 0, max: 60 })}
              {field('finalDays', 'Follow-up 2 → final (days)', 'number', { min: 0, max: 60 })}
              {field('closeAfterDays', 'Final → close (days)', 'number', { min: 1, max: 60 })}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="keepNurture" value="1" defaultChecked={s.keepNurture === '1'} className="h-5 w-5" />
              Instead of closing, keep them in <b>Nurture</b> and check back after
              <input name="nurtureDays" type="number" min={7} max={365} defaultValue={s.nurtureDays} className="w-20 rounded-md border border-slate-300 px-2 py-1" /> days
            </label>
            <p className="mt-2 text-xs text-slate-500">
              With these numbers a lead that never replies gets {[s.fu1Days, s.fu2Days, s.finalDays].filter((d) => Number(d) > 0).length + 1} messages
              over {[s.fu1Days, s.fu2Days, s.finalDays].reduce((n, d) => n + (Number(d) || 0), 0)} days, then {s.keepNurture === '1' ? 'moves to nurture' : `closes ${s.closeAfterDays} days later`}.
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="mb-3 text-sm font-semibold text-slate-700">They replied, you answered, then they went quiet</div>
            <div className="grid gap-3 sm:grid-cols-3">
              {field('dealCheck1Days', 'Check-in 1 after (days)', 'number', { min: 0, max: 60 })}
              {field('dealCheck2Days', 'Check-in 2 after (days)', 'number', { min: 0, max: 60 })}
            </div>
            <p className="mt-2 text-xs text-slate-500">After the last check-in, if they still don&apos;t answer, the lead closes {s.closeAfterDays} days later as “went quiet”.</p>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold">Message texts</h2>
          <p className="text-sm text-slate-500">Placeholders: <code>{PLACEHOLDERS}</code>. <code>{'{design_links}'}</code> becomes the designs you tick.
            You can still edit each message before sending. Empty = the default text.</p>
          {texts.map((key) => (
            <label key={key} className={label}>{MESSAGES[key].label}
              <textarea name={key} rows={key === 'first' ? 9 : 6} defaultValue={s[key]} className={input} />
            </label>
          ))}
        </section>

        <button className="self-start rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white">Save settings</button>
      </form>
      <form action={resetTexts} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-600">Undo your edits to the message texts and use the latest W3Tech texts again (price, limits and name stay).</p>
        <button className="mt-3 rounded-lg px-5 py-2.5 font-semibold ring-1 ring-slate-300">Reset message texts to default</button>
      </form>
    </div>
  );
}
