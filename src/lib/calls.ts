// Calling leads: the call queue, what happened on each call, and "3 unanswered calls, then drop".
// No daily limit — calls don't risk a WhatsApp ban.
import { addNote, getDb, type Lead } from '@/lib/leads-db';
import { recordReply } from '@/lib/outreach';

import { CALL_OUTCOMES, MAX_TRIES, type CallOutcome } from '@/lib/call-outcomes';

export { CALL_OUTCOMES, MAX_TRIES, type CallOutcome };
const DAY = 86_400_000;

export type CallRow = { id: number; lead_id: string; at: string; outcome: CallOutcome; note: string | null };

// Leads you can still call: anyone not already talking to you, won or closed for good, with fewer than 3 missed calls.
const OPEN = `archived = 0 AND phone IS NOT NULL AND phone <> ''
  AND status IN ('new', 'queued', 'waiting_reply', 'nurture', 'no_reply')
  AND COALESCE(call_count, 0) < ${MAX_TRIES}
  AND COALESCE(call_result, '') NOT IN ('yes', 'meeting', 'has_site', 'not_interested', 'wrong', 'dropped')`;

function istDayStart(): string {
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600_000).toISOString();
}

/** Who to call now: call-backs and retries that are due first, then everyone else, best leads first. */
export async function callQueue(limit = 25): Promise<{ leads: Lead[]; due: number; waiting: number; today: Record<string, number> }> {
  const conn = await getDb();
  const now = new Date().toISOString();
  const res = await conn.execute({
    sql: `SELECT * FROM leads WHERE ${OPEN} AND (next_call_at IS NULL OR next_call_at <= ?)
          ORDER BY (next_call_at IS NULL), next_call_at, COALESCE(score, 0) DESC, COALESCE(review_count, 0) DESC, created_at ASC LIMIT ?`,
    args: [now, limit],
  });
  const count = async (extra: string) =>
    Number((await conn.execute({ sql: `SELECT COUNT(*) n FROM leads WHERE ${OPEN} ${extra}`, args: extra ? [now] : [] })).rows[0].n);
  const due = await count('AND (next_call_at IS NULL OR next_call_at <= ?)');
  const waiting = await count('AND next_call_at > ?');
  const today: Record<string, number> = {};
  const rows = await conn.execute({ sql: 'SELECT outcome, COUNT(*) n FROM lead_calls WHERE at >= ? GROUP BY outcome', args: [istDayStart()] });
  for (const r of rows.rows) today[String(r.outcome)] = Number(r.n);
  return { leads: res.rows as unknown as Lead[], due, waiting, today };
}

export async function callsFor(leadId: string): Promise<CallRow[]> {
  const conn = await getDb();
  const res = await conn.execute({ sql: 'SELECT * FROM lead_calls WHERE lead_id = ? ORDER BY id DESC', args: [leadId] });
  return res.rows as unknown as CallRow[];
}

/** Record one call. Unanswered calls count toward the 3 tries; after the third the lead is dropped. */
export async function recordCall(id: string, outcome: CallOutcome, note: string, laterDays = 1): Promise<{ dropped: boolean }> {
  if (!(outcome in CALL_OUTCOMES)) throw new Error('Unknown call outcome');
  const conn = await getDb();
  const cur = await conn.execute({ sql: 'SELECT status, call_count FROM leads WHERE id = ?', args: [id] });
  if (!cur.rows.length) throw new Error('Lead not found');
  const status = String(cur.rows[0].status);
  const now = new Date();
  const iso = now.toISOString();
  const text = note.trim().slice(0, 2000);
  await conn.execute({ sql: 'INSERT INTO lead_calls (lead_id, outcome, note) VALUES (?, ?, ?)', args: [id, outcome, text || null] });

  const missed = outcome === 'no_answer' || outcome === 'busy';
  const tries = Number(cur.rows[0].call_count || 0) + (missed ? 1 : 0);
  const dropped = missed && tries >= MAX_TRIES;
  let nextCall: string | null = null;
  if (missed && !dropped) nextCall = new Date(now.getTime() + DAY).toISOString();
  if (outcome === 'later') nextCall = new Date(now.getTime() + Math.max(0, laterDays) * DAY + (laterDays === 0 ? 3 * 3600_000 : 0)).toISOString();

  // Closing statuses only replace an early stage — never a lead that is further along.
  const early = ['new', 'queued', 'waiting_reply', 'nurture', 'no_reply'].includes(status);
  const newStatus = !early ? status
    : outcome === 'not_interested' ? 'not_interested'
    : outcome === 'has_site' || outcome === 'wrong' ? 'skipped'
    : dropped ? 'no_reply'
    : status;
  await conn.execute({
    sql: `UPDATE leads SET call_count = ?, last_call_at = ?, next_call_at = ?, call_result = ?, status = ?, updated_at = ? WHERE id = ?`,
    args: [tries, iso, nextCall, dropped ? 'dropped' : outcome, newStatus, iso, id],
  });
  const label = CALL_OUTCOMES[outcome].label.replace(/^\S+\s/, '');
  await conn.execute({
    sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'call', ?, 'dashboard')",
    args: [id, `${label}${missed ? ` (try ${tries} of ${MAX_TRIES})` : ''}${dropped ? ' — dropped' : ''}${text ? ` · “${text.slice(0, 200)}”` : ''}`],
  });
  if (text) await addNote(id, `📞 ${label}: ${text}`);

  // "Send it" / "let's meet" is a yes: it becomes a reply, so the lead moves to Replied and the
  // after-call WhatsApp message is ready on the lead page and in Actions.
  if (outcome === 'yes' || outcome === 'meeting') {
    await recordReply(id, `📞 On the call: ${text || (outcome === 'meeting' ? 'wants a Google Meet' : 'said “send the sample”')}`, 'call_yes');
  }
  return { dropped };
}
