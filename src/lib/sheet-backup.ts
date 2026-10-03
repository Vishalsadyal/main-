// Backup of the leads database to the W3Tech Google Sheet (Apps Script web app, sheets/DemoApi.gs).
//
// The dashboard is the only thing that writes leads to the Sheet, so there are no duplicates:
//   - "Hunt Leads" tab: one row per lead, matched by lead id and updated in place
//   - "Messages" tab:   one row per message, matched by message id and added only once
// Only what changed since the last backup is sent. Runs by itself after leads arrive or
// change (scheduleBackup), and from the "Back up now" button in Settings.
import { after } from 'next/server';
import { getDb, LEAD_STATUSES, type Lead, type LeadStatus } from '@/lib/leads-db';
import { competitors } from '@/lib/outreach';

const MARK_LEADS = '_sheet_leads_until';   // updated_at of the last lead backed up
const MARK_MESSAGES = '_sheet_messages_id'; // id of the last message backed up
const MARK_RESULT = '_sheet_last_result';
const LEAD_BATCH = 200;
const MESSAGE_BATCH = 500;

export function sheetConfigured(): boolean {
  return Boolean((process.env.SHEETS_API_URL || process.env.DEMO_SHEETS_URL) && process.env.SHEETS_API_KEY);
}

async function mark(key: string): Promise<string | null> {
  const r = await (await getDb()).execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: [key] });
  return r.rows.length ? String(r.rows[0].value) : null;
}
async function setMark(key: string, value: string): Promise<void> {
  await (await getDb()).execute({
    sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    args: [key, value, new Date().toISOString()],
  });
}

async function post(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.SHEETS_API_URL || process.env.DEMO_SHEETS_URL!;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' }, // Apps Script: no CORS preflight; it redirects to the result
    body: JSON.stringify({ key: process.env.SHEETS_API_KEY, ...body }),
    cache: 'no-store',
  });
  try {
    return await res.json();
  } catch {
    return { ok: false, error: `The Sheet script answered with ${res.status} — is it deployed with access "Anyone"?` };
  }
}

function row(l: Lead) {
  const c = competitors(l);
  const site = (x: { website: string | boolean }) => (typeof x.website === 'string' && x.website ? ` (${x.website})` : x.website ? ' (has website)' : '');
  const comp = [...c.top.map((x) => `#${x.rank} ${x.name}${site(x)}`), ...c.nearby.map((x) => `${x.name} ${x.km} km${site(x)}`)].join('; ');
  return {
    key: l.id, business_name: l.name, listing_title: l.title, category: l.category_label, phone: l.phone,
    whatsapp: l.whatsapp, website: l.website, address: l.address, city: l.city, state: l.state, country: l.country,
    score: l.score, reasons: l.reasons, status: LEAD_STATUSES[l.status as LeadStatus] || l.status, maps_url: l.maps_url,
    demo_link: l.demo_link, hunt: l.hunt, search: l.search, found_at: l.found_at, last_message: l.last_message,
    sent_at: l.sent_at, rating: l.rating, reviews: l.review_count, rating_source: l.rating_source, priority: l.priority,
    last_reply: l.last_reply, notes: l.notes, archived: l.archived ? 'yes' : '', search_rank: l.search_rank,
    competitors: comp, dashboard_updated_at: l.updated_at,
  };
}

export type BackupResult = { ok: boolean; leads: number; messages: number; error?: string; at: string };

let running: Promise<BackupResult> | null = null;

/** Send everything changed since the last backup. `full` re-sends all leads (rows are updated, never duplicated). */
export function backupToSheet(full = false): Promise<BackupResult> {
  if (!running) running = run(full).finally(() => { running = null; });
  return running;
}

async function run(full: boolean): Promise<BackupResult> {
  const at = new Date().toISOString();
  const result: BackupResult = { ok: true, leads: 0, messages: 0, at };
  if (!sheetConfigured()) return { ...result, ok: false, error: 'Google Sheet not set up (SHEETS_API_URL / SHEETS_API_KEY)' };
  const conn = await getDb();
  try {
    // Leads: oldest change first, so a failure part-way resumes from the right place next time.
    let since = full ? '' : (await mark(MARK_LEADS)) || '';
    for (;;) {
      const res = await conn.execute({ sql: 'SELECT * FROM leads WHERE updated_at > ? ORDER BY updated_at LIMIT ?', args: [since, LEAD_BATCH] });
      const leads = res.rows as unknown as Lead[];
      if (!leads.length) break;
      const r = await post({ action: 'saveHuntLeads', leads: leads.map(row) });
      if (!r.ok) throw new Error(r.error === 'unknown action' ? 'The Sheet script is out of date — deploy the latest sheets/DemoApi.gs' : r.error || 'Sheet error');
      since = leads[leads.length - 1].updated_at;
      await setMark(MARK_LEADS, since);
      result.leads += leads.length;
      if (leads.length < LEAD_BATCH) break;
    }
    // Messages: never change, so each is sent once (by id).
    let lastId = Number(full ? 0 : (await mark(MARK_MESSAGES)) || 0);
    for (;;) {
      const res = await conn.execute({
        sql: `SELECT m.*, l.name AS business_name FROM lead_messages m LEFT JOIN leads l ON l.id = m.lead_id
              WHERE m.id > ? ORDER BY m.id LIMIT ?`,
        args: [lastId, MESSAGE_BATCH],
      });
      const msgs = res.rows;
      if (!msgs.length) break;
      const r = await post({ action: 'saveMessages', messages: msgs.map((m) => ({
        id: m.id, lead_id: m.lead_id, business_name: m.business_name, at: m.at,
        direction: m.dir === 'in' ? 'They replied' : 'You sent', kind: m.kind, text: m.text })) });
      if (!r.ok) throw new Error(r.error === 'unknown action' ? 'The Sheet script is out of date — deploy the latest sheets/DemoApi.gs' : r.error || 'Sheet error');
      lastId = Number(msgs[msgs.length - 1].id);
      await setMark(MARK_MESSAGES, String(lastId));
      result.messages += msgs.length;
      if (msgs.length < MESSAGE_BATCH) break;
    }
  } catch (err) {
    result.ok = false;
    result.error = err instanceof Error ? err.message : String(err);
  }
  await setMark(MARK_RESULT, JSON.stringify(result));
  return result;
}

export async function lastBackup(): Promise<BackupResult | null> {
  const v = await mark(MARK_RESULT);
  try { return v ? JSON.parse(v) : null; } catch { return null; }
}

/** Back up after the response is sent (leads arrived or changed). Never slows the page down. */
export function scheduleBackup(): void {
  if (!sheetConfigured()) return;
  try {
    after(() => backupToSheet().catch(() => undefined));
  } catch {
    void backupToSheet().catch(() => undefined); // outside a request (shouldn't happen)
  }
}
