// Records demo page views and button clicks in the "W3Tech Demos" Google Sheet
// (Events tab). Called by the demo page itself; stores no personal data.
import { NextRequest, NextResponse } from 'next/server';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EVENTS = new Set(['view', 'call', 'whatsapp', 'email', 'cta_header', 'cta_hero', 'cta_appointment', 'cta_contact']);

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  const body = (await request.json().catch(() => null)) as { event?: string; page?: string } | null;
  const event = body?.event ?? '';
  const sheetsUrl = process.env.DEMO_SHEETS_URL;

  if (!sheetsUrl || !SLUG.test(slug) || slug.length > 120 || !EVENTS.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'track', slug, event, page: String(body?.page ?? '').slice(0, 200) }),
      redirect: 'follow',
    });
  } catch {
    // Tracking must never break the demo page.
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
