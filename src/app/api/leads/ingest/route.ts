// Leads from the W3Tech Outreach Ext browser extension.
//   GET  -> {ok, service}  reachability check (no data, no login)
//   POST {leads: [...]} with `Authorization: Bearer <LEADS_API_KEY>`
//        -> {ok, added, updated, duplicates, invalid, problems}
// Leads are validated and de-duplicated (same listing, same phone, or same name in the
// same city); known ones are refreshed and their status only ever moves forward.
// Nothing is ever deleted.
import { createHash, timingSafeEqual } from 'node:crypto';
import { isConfigured, upsertLeads } from '@/lib/leads-db';
import { scheduleBackup } from '@/lib/sheet-backup';

export const dynamic = 'force-dynamic';

function authorised(request: Request): boolean {
  const key = process.env.LEADS_API_KEY;
  if (!key) return false;
  const sent = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = createHash('sha256').update(sent).digest();
  const b = createHash('sha256').update(key).digest();
  return timingSafeEqual(a, b);
}

export async function GET() {
  return Response.json({ ok: true, service: 'w3tech-leads', ready: Boolean(process.env.LEADS_API_KEY) && isConfigured() },
    { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!process.env.LEADS_API_KEY) return Response.json({ ok: false, error: 'LEADS_API_KEY is not set on this site' }, { status: 503 });
  if (!authorised(request)) return Response.json({ ok: false, error: 'wrong API key' }, { status: 401 });
  if (!isConfigured()) return Response.json({ ok: false, error: 'database not configured' }, { status: 503 });
  let body: { leads?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'bad json' }, { status: 400 });
  }
  if (!Array.isArray(body.leads) || body.leads.length > 500) {
    return Response.json({ ok: false, error: 'send 1-500 leads' }, { status: 400 });
  }
  try {
    const result = await upsertLeads(body.leads.filter((l) => l && typeof l === 'object') as Record<string, unknown>[]);
    if (result.added || result.updated) scheduleBackup();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error('leads ingest failed', err);
    return Response.json({ ok: false, error: 'database error' }, { status: 500 });
  }
}
