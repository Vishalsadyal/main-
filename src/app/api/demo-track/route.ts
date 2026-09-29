// Records what a lead does on their demo page — opens, button clicks, sections seen,
// scroll depth and time on page — in the "W3Tech Demos" Google Sheet (Events tab).
// Adds the visitor's IP, approximate location (from Vercel's geo headers) and device
// so the W3Tech Sales Engine can show whether and how the lead engaged.
import { NextRequest, NextResponse } from 'next/server';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EVENTS = new Set([
  'view', 'call', 'whatsapp', 'email', 'cta_header', 'cta_hero', 'cta_appointment', 'cta_contact',
  'section', 'scroll', 'leave',
]);

type Body = { event?: string; page?: string; detail?: string; visitor?: string; referrer?: string };

function clip(value: unknown, max: number): string {
  return String(value ?? '').slice(0, max);
}

function decode(value: string | null): string {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function deviceOf(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile';
  return ua ? 'desktop' : '';
}

function browserOf(ua: string): string {
  const known: [RegExp, string][] = [
    [/Edg\//, 'Edge'], [/OPR\/|Opera/, 'Opera'], [/SamsungBrowser/, 'Samsung Internet'],
    [/FBAN|FBAV|Instagram/, 'In-app (Facebook/Instagram)'], [/WhatsApp/, 'WhatsApp'],
    [/Chrome\//, 'Chrome'], [/Firefox\//, 'Firefox'], [/Safari\//, 'Safari'],
  ];
  return known.find(([re]) => re.test(ua))?.[1] ?? '';
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  const body = (await request.json().catch(() => null)) as Body | null;
  const event = body?.event ?? '';
  const sheetsUrl = process.env.DEMO_SHEETS_URL;

  if (!sheetsUrl || !SLUG.test(slug) || slug.length > 120 || !EVENTS.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const h = request.headers;
  const ua = h.get('user-agent') ?? '';
  const meta = {
    detail: clip(body?.detail, 100),
    visitor: clip(body?.visitor, 40).replace(/[^a-z0-9]/gi, ''),
    referrer: clip(body?.referrer, 300),
    ip: clip(h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim(), 64),
    city: clip(decode(h.get('x-vercel-ip-city')), 100),
    region: clip(h.get('x-vercel-ip-country-region'), 100),
    country: clip(h.get('x-vercel-ip-country'), 10),
    device: deviceOf(ua),
    browser: browserOf(ua),
    user_agent: clip(ua, 300),
  };

  try {
    await fetch(sheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'track', slug, event, page: clip(body?.page, 200), meta }),
      redirect: 'follow',
    });
  } catch {
    // Tracking must never break the demo page.
  }
  return NextResponse.json({ ok: true }, { status: 202 });
}
