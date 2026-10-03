// Views and taps on personalised design pages (/for/<design>/…?l=<lead id>), sent by the small
// script that page adds. Stored per lead and design so the dashboard can show which design a
// lead engaged with. Only known leads and designs are accepted; nothing else is stored.
import { getDesign } from '@/lib/demo-library';
import { getDb, isConfigured } from '@/lib/leads-db';

export const dynamic = 'force-dynamic';

const EVENTS = new Set(['view', 'whatsapp', 'call', 'cta', 'leave']);

export async function POST(request: Request) {
  const none = new Response(null, { status: 204 });
  if (!isConfigured()) return none;
  let body: { l?: unknown; d?: unknown; e?: unknown; s?: unknown };
  try {
    body = JSON.parse(await request.text());
  } catch {
    return none;
  }
  const lead = String(body.l || '').slice(0, 200);
  const design = String(body.d || '');
  const event = String(body.e || '');
  if (!/^[\w:.\-]{3,200}$/.test(lead) || !getDesign(design) || !EVENTS.has(event)) return none;
  const seconds = event === 'leave' ? Math.max(0, Math.min(3600, Math.round(Number(body.s) || 0))) : null;
  const ua = request.headers.get('user-agent') || '';
  const device = /bot|crawler|spider|preview|whatsapp|facebookexternalhit/i.test(ua) ? 'bot' : /mobile|android|iphone/i.test(ua) ? 'mobile' : 'desktop';
  if (device === 'bot') return none; // WhatsApp's link preview fetch is not a real view
  try {
    const conn = await getDb();
    const known = await conn.execute({ sql: 'SELECT 1 FROM leads WHERE id = ?', args: [lead] });
    if (!known.rows.length) return none;
    await conn.execute({
      sql: 'INSERT INTO demo_events (lead_id, design, event, seconds, device) VALUES (?, ?, ?, ?, ?)',
      args: [lead, design, event, seconds, device],
    });
  } catch (err) {
    console.error('demo-event failed', err);
  }
  return none;
}
