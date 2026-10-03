// CSV download of the leads matching the dashboard filters (login required).
import { isLoggedIn } from '@/lib/dashboard-auth';
import { allLeadsForExport, LEAD_STATUSES, type LeadFilters } from '@/lib/leads-db';

export const dynamic = 'force-dynamic';

const COLUMNS: [string, string][] = [
  ['Name', 'name'], ['Listing title', 'title'], ['Business type', 'category_label'], ['Phone', 'phone'], ['WhatsApp', 'whatsapp'],
  ['Website', 'website'], ['Address', 'address'], ['City', 'city'], ['State', 'state'], ['Country', 'country'],
  ['Rating', 'rating'], ['Reviews', 'review_count'], ['Rating source', 'rating_source'], ['Score', 'score'],
  ['Priority', 'priority'], ['Status', 'status'], ['Preview link', 'demo_link'], ['Map', 'maps_url'], ['Found', 'found_at'],
  ['Messaged', 'sent_at'], ['Notes', 'notes'], ['Archived', 'archived'],
];

function cell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // never let a spreadsheet run it as a formula
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  if (!(await isLoggedIn())) return new Response('Log in first.', { status: 401 });
  const sp = new URL(request.url).searchParams;
  const filters: LeadFilters = Object.fromEntries(
    ['q', 'status', 'city', 'category', 'priority', 'website', 'archived'].map((k) => [k, sp.get(k) || '']));
  const rows = await allLeadsForExport(filters);
  const csv = [COLUMNS.map(([h]) => h).join(',')]
    .concat(rows.map((r) => COLUMNS.map(([, k]) => {
      const v = (r as unknown as Record<string, unknown>)[k];
      return cell(k === 'status' ? LEAD_STATUSES[v as keyof typeof LEAD_STATUSES] || v : v);
    }).join(',')))
    .join('\r\n');
  return new Response('﻿' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="w3tech-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
