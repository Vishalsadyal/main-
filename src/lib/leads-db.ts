// W3Tech leads database (SQLite).
//
// Production (Vercel): a Turso database — hosted SQLite — via LEADS_DB_URL + LEADS_DB_TOKEN.
// Local (`npm run dev`): a plain SQLite file, data/leads.db, when LEADS_DB_URL is not set.
//
// Leads can never be deleted. The database itself enforces it with triggers, so no
// code path (dashboard, API or a mistake) can remove a lead or rewrite its history:
//   - DELETE on `leads` is refused             -> use "archive" instead
//   - `lead_history` is append-only             -> no UPDATE, no DELETE
//   - every change to a lead's status, notes or archive flag is written to
//     `lead_history` by a trigger, so it is recorded even if the app forgets.
import { createClient, type Client, type InValue } from '@libsql/client';

export const LEAD_STATUSES = {
  new: 'New',
  queued: "In today's queue",
  waiting_reply: 'Sent — waiting for reply',
  replied: 'Replied',
  interested: 'Designs shown',
  proposal: 'Pricing sent',
  won: 'Won',
  nurture: 'Nurture (no reply)',
  no_reply: 'Closed — no reply',
  not_interested: 'Not interested',
  no_whatsapp: 'Not on WhatsApp',
  skipped: 'Skipped',
} as const;
export type LeadStatus = keyof typeof LEAD_STATUSES;

export type Lead = {
  id: string;
  name: string;
  title: string | null;
  category: string | null;
  category_label: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  rating: number | null;
  review_count: number | null;
  rating_source: string | null;
  score: number | null;
  priority: string | null;
  reasons: string | null;
  status: LeadStatus;
  maps_url: string | null;
  demo_link: string | null;
  hunt: string | null;
  search: string | null;
  found_at: string | null;
  sent_at: string | null;
  last_message: string | null;
  notes: string | null;
  archived: number;
  search_rank: number | null;
  competitors: string | null; // JSON: {top: [...], nearby: [...], search}
  last_reply: string | null;
  last_reply_at: string | null;
  follow_up_count: number | null;
  last_contacted_at: string | null;
  next_action_at: string | null; // when to follow up next
  intent: string | null;         // what their last reply asked for (price, call, changes…)
  demos_sent: string | null;     // JSON list of design ids already sent
  closing: number | null;        // 1 = the follow-up plan is over; the lead closes at next_action_at
  created_at: string;
  updated_at: string;
};

export type HistoryRow = { id: number; lead_id: string; at: string; action: string; detail: string | null; source: string };

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    title TEXT, category TEXT, category_label TEXT, phone TEXT, whatsapp TEXT, website TEXT, address TEXT,
    city TEXT, state TEXT, country TEXT, lat REAL, lon REAL,
    rating REAL, review_count INTEGER, rating_source TEXT,
    score INTEGER, priority TEXT, reasons TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    maps_url TEXT, demo_link TEXT, hunt TEXT, search TEXT, found_at TEXT, sent_at TEXT, last_message TEXT,
    notes TEXT,
    phone_key TEXT, name_key TEXT,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS leads_status ON leads(status)`,
  `CREATE INDEX IF NOT EXISTS leads_score ON leads(score DESC)`,
  `CREATE INDEX IF NOT EXISTS leads_city ON leads(city)`,
  `CREATE TABLE IF NOT EXISTS lead_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT NOT NULL,
    at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    action TEXT NOT NULL,
    detail TEXT,
    source TEXT NOT NULL DEFAULT 'dashboard'
  )`,
  `CREATE INDEX IF NOT EXISTS lead_history_lead ON lead_history(lead_id, id)`,
  // WhatsApp conversation per lead: what you sent ("out") and what they replied ("in").
  `CREATE TABLE IF NOT EXISTS lead_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT NOT NULL,
    at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    dir TEXT NOT NULL CHECK (dir IN ('in', 'out')),
    kind TEXT,
    text TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS lead_messages_lead ON lead_messages(lead_id, id)`,
  `CREATE INDEX IF NOT EXISTS lead_messages_at ON lead_messages(at)`,
  // Views and taps on the personalised design pages (/for/<design>/…?l=<lead id>).
  `CREATE TABLE IF NOT EXISTS demo_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT NOT NULL,
    design TEXT NOT NULL,
    event TEXT NOT NULL,
    seconds INTEGER,
    device TEXT,
    at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  `CREATE INDEX IF NOT EXISTS demo_events_lead ON demo_events(lead_id, design)`,
  `CREATE TRIGGER IF NOT EXISTS demo_events_no_delete BEFORE DELETE ON demo_events
   BEGIN SELECT RAISE(ABORT, 'Demo events cannot be deleted.'); END`,
  `CREATE TRIGGER IF NOT EXISTS demo_events_no_update BEFORE UPDATE ON demo_events
   BEGIN SELECT RAISE(ABORT, 'Demo events cannot be changed.'); END`,
  `CREATE TRIGGER IF NOT EXISTS messages_no_delete BEFORE DELETE ON lead_messages
   BEGIN SELECT RAISE(ABORT, 'Messages cannot be deleted.'); END`,
  `CREATE TRIGGER IF NOT EXISTS messages_no_update BEFORE UPDATE ON lead_messages
   BEGIN SELECT RAISE(ABORT, 'Messages cannot be changed.'); END`,
  // Dashboard settings (price, daily limit, message texts…), changed from the Settings page.
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  )`,
  // ---- protection: nothing is ever deleted, history is never rewritten
  `CREATE TRIGGER IF NOT EXISTS leads_no_delete BEFORE DELETE ON leads
   BEGIN SELECT RAISE(ABORT, 'Leads cannot be deleted. Archive the lead instead.'); END`,
  `CREATE TRIGGER IF NOT EXISTS history_no_delete BEFORE DELETE ON lead_history
   BEGIN SELECT RAISE(ABORT, 'Lead history cannot be deleted.'); END`,
  `CREATE TRIGGER IF NOT EXISTS history_no_update BEFORE UPDATE ON lead_history
   BEGIN SELECT RAISE(ABORT, 'Lead history cannot be changed.'); END`,
  // A lead's id and the time it was first saved never change.
  `CREATE TRIGGER IF NOT EXISTS leads_keep_identity BEFORE UPDATE OF id, created_at ON leads
   WHEN NEW.id IS NOT OLD.id OR NEW.created_at IS NOT OLD.created_at
   BEGIN SELECT RAISE(ABORT, 'A lead''s id and creation time cannot be changed.'); END`,
  // ---- automatic history for the fields people change
  `CREATE TRIGGER IF NOT EXISTS leads_log_insert AFTER INSERT ON leads
   BEGIN INSERT INTO lead_history (lead_id, action, detail, source)
     VALUES (NEW.id, 'created', 'Saved (' || COALESCE(NEW.search, 'added') || ')', 'database'); END`,
  `CREATE TRIGGER IF NOT EXISTS leads_log_status AFTER UPDATE OF status ON leads WHEN NEW.status IS NOT OLD.status
   BEGIN INSERT INTO lead_history (lead_id, action, detail, source)
     VALUES (NEW.id, 'status', OLD.status || ' → ' || NEW.status, 'database'); END`,
  `CREATE TRIGGER IF NOT EXISTS leads_log_notes AFTER UPDATE OF notes ON leads WHEN NEW.notes IS NOT OLD.notes
   BEGIN INSERT INTO lead_history (lead_id, action, detail, source)
     VALUES (NEW.id, 'notes', substr(COALESCE(NEW.notes, ''), -500), 'database'); END`,
  `CREATE TRIGGER IF NOT EXISTS leads_log_archive AFTER UPDATE OF archived ON leads WHEN NEW.archived IS NOT OLD.archived
   BEGIN INSERT INTO lead_history (lead_id, action, detail, source)
     VALUES (NEW.id, CASE NEW.archived WHEN 1 THEN 'archived' ELSE 'unarchived' END, NULL, 'database'); END`,
];

let client: Client | null = null;
let ready: Promise<void> | null = null;

export function isConfigured(): boolean {
  return Boolean(process.env.LEADS_DB_URL) || process.env.NODE_ENV !== 'production';
}

function db(): Client {
  if (!client) {
    const url = process.env.LEADS_DB_URL || 'file:data/leads.db';
    if (url.startsWith('file:')) {
      // Local file: make sure the folder exists.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { mkdirSync } = require('node:fs') as typeof import('node:fs');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { dirname } = require('node:path') as typeof import('node:path');
      mkdirSync(dirname(url.slice(5)), { recursive: true });
    }
    client = createClient({ url, authToken: process.env.LEADS_DB_TOKEN || undefined });
  }
  return client;
}

export async function getDb(): Promise<Client> {
  if (!ready) {
    ready = db()
      .batch(SCHEMA, 'write')
      .then(() => migrate(db()))
      .catch((err) => {
        ready = null;
        throw err;
      });
  }
  await ready;
  return db();
}

/** Additive changes for databases created by an older version (columns are only ever added). */
async function migrate(conn: Client): Promise<void> {
  const cols = new Set((await conn.execute('PRAGMA table_info(leads)')).rows.map((r) => String(r.name)));
  for (const [col, type] of [['phone_key', 'TEXT'], ['name_key', 'TEXT'], ['search_rank', 'INTEGER'],
                             ['competitors', 'TEXT'], ['last_reply', 'TEXT'], ['last_reply_at', 'TEXT'], ['follow_up_count', 'INTEGER'],
                             ['last_contacted_at', 'TEXT'], ['next_action_at', 'TEXT'], ['intent', 'TEXT'], ['demos_sent', 'TEXT'], ['closing', 'INTEGER']]) {
    if (!cols.has(col)) await conn.execute(`ALTER TABLE leads ADD COLUMN ${col} ${type}`);
  }
  const msgCols = new Set((await conn.execute('PRAGMA table_info(lead_messages)')).rows.map((r) => String(r.name)));
  if (!msgCols.has('demos')) await conn.execute('ALTER TABLE lead_messages ADD COLUMN demos TEXT');
  await conn.batch([
    'CREATE INDEX IF NOT EXISTS leads_phone_key ON leads(phone_key)',
    'CREATE INDEX IF NOT EXISTS leads_name_key ON leads(name_key)',
  ], 'write');
  // Fill the keys for leads saved before they existed.
  const missing = await conn.execute('SELECT id, phone, name, city FROM leads WHERE phone_key IS NULL AND name_key IS NULL LIMIT 5000');
  for (const r of missing.rows) {
    await conn.execute({
      sql: 'UPDATE leads SET phone_key = ?, name_key = ? WHERE id = ?',
      args: [phoneKey(r.phone as string | null), nameKey(r.name as string | null, r.city as string | null), r.id as string],
    });
  }
}

const now = () => new Date().toISOString();

// ------------------------------------------------------------------ import from the extension

export type IncomingLead = Partial<Record<string, unknown>> & { key?: unknown };
export type ImportResult = { added: number; updated: number; duplicates: number; invalid: number; problems: string[] };

const str = (v: unknown, max = 500): string | null => {
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
};
const text = (v: unknown, max: number): string | null => {
  // Like str() but keeps line breaks (messages).
  if (v === undefined || v === null) return null;
  const s = String(v).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim();
  return s ? s.slice(0, max) : null;
};
const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const phone = (v: unknown): string | null => {
  const s = str(v, 40);
  if (!s || !/^\+?[\d\s().\-/]{7,25}$/.test(s)) return null;
  const digits = s.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15 ? s : null;
};
const url = (v: unknown, hosts?: RegExp): string | null => {
  const s = str(v, 600);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return null;
    if (hosts && !hosts.test(u.hostname)) return null;
    return u.toString();
  } catch {
    return null;
  }
};
const isoDate = (v: unknown): string | null => {
  const s = str(v, 40);
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
};
const STATUS_ALIASES: Record<string, LeadStatus> = { sent: 'waiting_reply' };
const toStatus = (v: unknown): LeadStatus | null => {
  const s = String(v ?? '');
  const mapped = (STATUS_ALIASES[s] ?? s) as LeadStatus;
  return mapped in LEAD_STATUSES ? mapped : null;
};

/** Competitors from the extension: keep only the expected shape, small and clean. */
function competitorsJson(v: unknown): string | null {
  let data: unknown = v;
  if (typeof v === 'string') {
    try { data = JSON.parse(v); } catch { return null; }
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as { top?: unknown; nearby?: unknown; search?: unknown };
  const list = (x: unknown) => (Array.isArray(x) ? x : []).slice(0, 3).map((c) => {
    const o = (c || {}) as Record<string, unknown>;
    // website: their site address (older data only says true/false)
    const website = typeof o.website === 'string' ? url(o.website) || '' : o.website === true;
    return { name: str(o.name, 120), rank: num(o.rank, 1, 1000), website, ratingSource: str(o.ratingSource, 40),
             rating: num(o.rating, 0, 5), reviews: num(o.reviews, 0, 10_000_000), km: num(o.km, 0, 1000) };
  }).filter((c) => c.name);
  const out = { top: list(d.top), nearby: list(d.nearby), search: str(d.search, 120) };
  return out.top.length || out.nearby.length ? JSON.stringify(out) : null;
}

/** Keys that identify the same business: last 10 digits of the phone, and name + city. */
export function phoneKey(p: string | null): string | null {
  const d = (p || '').replace(/\D/g, '');
  return d.length >= 7 ? d.slice(-10) : null;
}
export function nameKey(name: string | null, city: string | null): string | null {
  const n = (name || '').toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
  return n ? `${n}|${(city || '').toLowerCase().trim()}` : null;
}

// Status order: an older copy from the extension must not move a lead backwards
// (e.g. "won" in the dashboard must not become "new" again).
const RANK: Record<LeadStatus, number> = {
  new: 0, skipped: 1, queued: 1, no_whatsapp: 2, waiting_reply: 3, nurture: 3, no_reply: 3, replied: 4, not_interested: 5,
  interested: 5, proposal: 6, won: 7,
};

/** Validate and save leads from the extension.
 *  - invalid:    no id or name, or a malformed id — not saved
 *  - duplicates: the same business under another id (same phone, or same name in the same city),
 *                or repeated within this batch — not saved again
 *  - updated:    known id — data refreshed, status only ever moves forward
 *  Bad individual fields (a phone with letters, a website that isn't a link…) are dropped, not saved.
 *  Notes and archive state are dashboard-only and never touched here. */
export async function upsertLeads(rows: IncomingLead[]): Promise<ImportResult> {
  const conn = await getDb();
  const result: ImportResult = { added: 0, updated: 0, duplicates: 0, invalid: 0, problems: [] };
  const problem = (msg: string) => { if (result.problems.length < 10) result.problems.push(msg); };
  const seen = new Set<string>();

  for (const r of rows.slice(0, 500)) {
    const id = str(r.key ?? r.id, 200);
    const name = str(r.business_name ?? r.name, 200);
    if (!id || !/^[\w:.\-]{3,200}$/.test(id)) { result.invalid++; problem(`Bad id: ${String(r.key ?? r.id ?? '(none)').slice(0, 40)}`); continue; }
    if (!name || name.length < 2) { result.invalid++; problem(`No business name for ${id}`); continue; }

    const data = {
      name,
      title: str(r.listing_title ?? r.title, 300),
      category: str(r.category_key, 80),
      category_label: str(r.category ?? r.category_label, 100),
      phone: phone(r.phone),
      whatsapp: url(r.whatsapp, /^(wa\.me|api\.whatsapp\.com)$/),
      website: url(r.website),
      address: str(r.address, 300),
      city: str(r.city, 100),
      state: str(r.state, 100),
      country: str(r.country, 100),
      lat: num(r.lat, -90, 90),
      lon: num(r.lon, -180, 180),
      rating: num(r.rating, 0, 5),
      review_count: num(r.reviews ?? r.review_count, 0, 10_000_000),
      rating_source: str(r.rating_source, 40),
      score: num(r.score, 0, 100),
      priority: ['high', 'normal', 'low'].includes(String(r.priority)) ? String(r.priority) : null,
      reasons: str(r.reasons, 1000),
      maps_url: url(r.maps_url, /(^|\.)bing\.com$|(^|\.)google\.[a-z.]+$/),
      demo_link: url(r.demo_link),
      hunt: str(r.hunt, 200),
      search: str(r.search, 200),
      found_at: isoDate(r.found_at),
      sent_at: isoDate(r.sent_at),
      last_message: text(r.last_message, 3000),
      search_rank: num(r.search_rank, 1, 1000),
      competitors: competitorsJson(r.competitors),
      phone_key: null as string | null,
      name_key: null as string | null,
    };
    data.phone_key = phoneKey(data.phone);
    data.name_key = nameKey(data.name, data.city);
    if (r.phone && !data.phone) problem(`${name}: phone "${String(r.phone).slice(0, 30)}" isn't a valid number — left out`);
    if (r.website && !data.website) problem(`${name}: website "${String(r.website).slice(0, 40)}" isn't a valid link — left out`);

    // Repeated within this batch?
    const batchKeys = [`id:${id}`, data.phone_key && `p:${data.phone_key}`, data.name_key && `n:${data.name_key}`]
      .filter(Boolean) as string[];
    if (batchKeys.some((k) => seen.has(k))) { result.duplicates++; continue; }
    batchKeys.forEach((k) => seen.add(k));

    const status = toStatus(r.status) ?? 'new';
    const existing = await conn.execute({ sql: 'SELECT status FROM leads WHERE id = ?', args: [id] });

    if (!existing.rows.length) {
      // Same business already saved under another id?
      const dup = await conn.execute({
        sql: `SELECT id FROM leads WHERE (phone_key IS NOT NULL AND phone_key = ?) OR (name_key IS NOT NULL AND name_key = ?) LIMIT 1`,
        args: [data.phone_key, data.name_key],
      });
      if (dup.rows.length) { result.duplicates++; continue; }
      const cols = Object.keys(data);
      await conn.execute({
        sql: `INSERT INTO leads (id, ${cols.join(', ')}, status, created_at, updated_at)
              VALUES (?, ${cols.map(() => '?').join(', ')}, ?, ?, ?)`,
        args: [id, ...(Object.values(data) as InValue[]), status, now(), now()],
      });
      result.added++;
      continue;
    }

    const current = existing.rows[0].status as LeadStatus;
    const nextStatus = (RANK[status] ?? 0) > (RANK[current] ?? 0) ? status : current;
    // Only fill or refresh fields that came with a valid value; never blank out what we have.
    const sets = Object.entries(data).filter(([, v]) => v !== null);
    await conn.execute({
      sql: `UPDATE leads SET ${sets.map(([k]) => `${k} = ?`).join(', ')}${sets.length ? ', ' : ''}status = ?, updated_at = ?
            WHERE id = ?`,
      args: [...(sets.map(([, v]) => v) as InValue[]), nextStatus, now(), id],
    });
    if (nextStatus !== current) {
      await conn.execute({
        sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'sync', ?, 'extension')",
        args: [id, `Updated from the extension: ${LEAD_STATUSES[nextStatus]}`],
      });
    }
    result.updated++;
  }
  return result;
}

// ------------------------------------------------------------------ dashboard queries

export type LeadFilters = {
  q?: string;
  status?: string;
  city?: string;
  category?: string;
  priority?: string;
  website?: string; // "none" | "has"
  archived?: string; // "1" shows archived leads
  sort?: string;
  page?: number;
};

export const PAGE_SIZE = 50;

function where(f: LeadFilters): { sql: string; args: InValue[] } {
  const parts: string[] = [f.archived === '1' ? 'archived = 1' : 'archived = 0'];
  const args: InValue[] = [];
  if (f.q) {
    parts.push('(name LIKE ? OR title LIKE ? OR phone LIKE ? OR city LIKE ? OR address LIKE ?)');
    const like = `%${f.q.slice(0, 100)}%`;
    args.push(like, like, like, like, like);
  }
  if (f.status && f.status in LEAD_STATUSES) {
    parts.push('status = ?');
    args.push(f.status);
  }
  if (f.city) {
    parts.push('city = ?');
    args.push(f.city);
  }
  if (f.category) {
    parts.push('category_label = ?');
    args.push(f.category);
  }
  if (f.priority) {
    parts.push('priority = ?');
    args.push(f.priority);
  }
  if (f.website === 'none') parts.push("(website IS NULL OR website = '')");
  if (f.website === 'has') parts.push("(website IS NOT NULL AND website <> '')");
  return { sql: parts.join(' AND '), args };
}

const SORTS: Record<string, string> = {
  score: 'score DESC, review_count DESC, created_at DESC',
  newest: 'created_at DESC',
  updated: 'updated_at DESC',
  name: 'name COLLATE NOCASE ASC',
};

export async function listLeads(f: LeadFilters): Promise<{ rows: Lead[]; total: number; page: number; pages: number }> {
  const conn = await getDb();
  const w = where(f);
  const total = Number((await conn.execute({ sql: `SELECT COUNT(*) n FROM leads WHERE ${w.sql}`, args: w.args })).rows[0].n);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, f.page || 1), pages);
  const res = await conn.execute({
    sql: `SELECT * FROM leads WHERE ${w.sql} ORDER BY ${SORTS[f.sort || ''] || SORTS.score} LIMIT ? OFFSET ?`,
    args: [...w.args, PAGE_SIZE, (page - 1) * PAGE_SIZE],
  });
  return { rows: res.rows as unknown as Lead[], total, page, pages };
}

export async function allLeadsForExport(f: LeadFilters): Promise<Lead[]> {
  const conn = await getDb();
  const w = where(f);
  const res = await conn.execute({ sql: `SELECT * FROM leads WHERE ${w.sql} ORDER BY ${SORTS.score}`, args: w.args });
  return res.rows as unknown as Lead[];
}

export async function stats() {
  const conn = await getDb();
  const r = (
    await conn.execute(`SELECT
      COUNT(*) total,
      SUM(CASE WHEN website IS NULL OR website = '' THEN 1 ELSE 0 END) no_website,
      SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END) high,
      SUM(CASE WHEN status = 'waiting_reply' THEN 1 ELSE 0 END) waiting,
      SUM(CASE WHEN status IN ('replied','interested','proposal','won') THEN 1 ELSE 0 END) replied,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) won,
      SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) today
      FROM leads WHERE archived = 0`)
  ).rows[0];
  const n = (k: string) => Number(r[k] ?? 0);
  return { total: n('total'), noWebsite: n('no_website'), high: n('high'), waiting: n('waiting'),
           replied: n('replied'), won: n('won'), today: n('today') };
}

export async function facets(): Promise<{ cities: string[]; categories: string[] }> {
  const conn = await getDb();
  const cities = await conn.execute(
    "SELECT city FROM leads WHERE archived = 0 AND city IS NOT NULL GROUP BY city ORDER BY COUNT(*) DESC LIMIT 200");
  const cats = await conn.execute(
    "SELECT category_label c FROM leads WHERE archived = 0 AND category_label IS NOT NULL GROUP BY c ORDER BY COUNT(*) DESC LIMIT 100");
  return { cities: cities.rows.map((r) => String(r.city)), categories: cats.rows.map((r) => String(r.c)) };
}

export async function getLead(id: string): Promise<{ lead: Lead; history: HistoryRow[] } | null> {
  const conn = await getDb();
  const res = await conn.execute({ sql: 'SELECT * FROM leads WHERE id = ?', args: [id] });
  if (!res.rows.length) return null;
  const history = await conn.execute({ sql: 'SELECT * FROM lead_history WHERE lead_id = ? ORDER BY id DESC LIMIT 200', args: [id] });
  return { lead: res.rows[0] as unknown as Lead, history: history.rows as unknown as HistoryRow[] };
}

// ------------------------------------------------------------------ dashboard changes

export async function setStatus(id: string, status: LeadStatus): Promise<void> {
  if (!(status in LEAD_STATUSES)) throw new Error('Unknown status');
  const conn = await getDb();
  await conn.execute({ sql: 'UPDATE leads SET status = ?, updated_at = ? WHERE id = ?', args: [status, now(), id] });
}

/** Notes are only ever added to (each with a timestamp), never replaced. */
export async function addNote(id: string, note: string): Promise<void> {
  const text = note.trim().slice(0, 2000);
  if (!text) return;
  const conn = await getDb();
  const stamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  await conn.execute({
    sql: `UPDATE leads SET notes = CASE WHEN notes IS NULL OR notes = '' THEN ? ELSE notes || char(10) || char(10) || ? END,
          updated_at = ? WHERE id = ?`,
    args: [`[${stamp}] ${text}`, `[${stamp}] ${text}`, now(), id],
  });
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  const conn = await getDb();
  await conn.execute({ sql: 'UPDATE leads SET archived = ?, updated_at = ? WHERE id = ?', args: [archived ? 1 : 0, now(), id] });
}
