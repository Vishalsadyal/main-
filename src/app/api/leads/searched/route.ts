// For the W3Tech Outreach Ext: the searches already done ("dentist in Ludhiana"…), so a new hunt
// can skip towns the dashboard already has leads for. Same key as /api/leads/ingest.
import { createHash, timingSafeEqual } from 'node:crypto';
import { getDb, isConfigured } from '@/lib/leads-db';

export const dynamic = 'force-dynamic';

function authorised(request: Request): boolean {
  const key = process.env.LEADS_API_KEY;
  if (!key) return false;
  const sent = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return timingSafeEqual(createHash('sha256').update(sent).digest(), createHash('sha256').update(key).digest());
}

export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ ok: false, error: 'wrong API key' }, { status: 401 });
  if (!isConfigured()) return Response.json({ ok: false, error: 'database not configured' }, { status: 503 });
  const conn = await getDb();
  const rows = await conn.execute("SELECT DISTINCT lower(search) s FROM leads WHERE search IS NOT NULL AND search <> ''");
  const total = Number((await conn.execute('SELECT COUNT(*) n FROM leads')).rows[0].n);
  return Response.json({ ok: true, searches: rows.rows.map((r) => String(r.s)), leads: total },
    { headers: { 'Cache-Control': 'no-store' } });
}
