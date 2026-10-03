import { requireLogin } from '@/lib/dashboard-auth';
import { getDb } from '@/lib/leads-db';
import { categories } from '@/lib/demo-library';

export const dynamic = 'force-dynamic';

export default async function DemosPage() {
  await requireLogin();
  const conn = await getDb();
  // How each design performs across all leads.
  const stats = await conn.execute(`SELECT design,
      COUNT(DISTINCT lead_id) leads,
      SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END) views,
      SUM(CASE WHEN event IN ('whatsapp','call','cta') THEN 1 ELSE 0 END) clicks
    FROM demo_events GROUP BY design`);
  const sentRows = await conn.execute("SELECT demos FROM lead_messages WHERE dir = 'out' AND demos IS NOT NULL");
  const sent: Record<string, number> = {};
  for (const r of sentRows.rows) {
    try { for (const d of JSON.parse(String(r.demos))) sent[d] = (sent[d] || 0) + 1; } catch { /* ignore */ }
  }
  const by: Record<string, { leads: number; views: number; clicks: number }> = {};
  for (const r of stats.rows) by[String(r.design)] = { leads: Number(r.leads), views: Number(r.views), clicks: Number(r.clicks) };
  const sample = (id: string) => `/for/${id}/your-business?n=${encodeURIComponent('Your Business')}&c=Ludhiana`;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-bold">Demo library</h1>
        <p className="mt-1 text-sm text-slate-600">Every design you can send. Each lead gets its own personalised link (their name, city and
          phone), and every open and tap is tracked per lead. To add a design, put its folder in <code>public/demos/medical/</code> and add
          it to <code>src/lib/demo-library.ts</code>.</p>
      </section>
      {categories().map(({ category, designs }) => (
        <section key={category} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{category} <span className="text-sm font-normal text-slate-500">{designs.length} designs</span></h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {designs.map((d) => {
              const st = by[d.id] || { leads: 0, views: 0, clicks: 0 };
              return (
                <article key={d.id} className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <iframe src={sample(d.id)} title={d.name} loading="lazy" tabIndex={-1}
                      className="pointer-events-none absolute left-0 top-0 h-[880px] w-[1400px] origin-top-left scale-[0.25] border-0" />
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="font-semibold">{d.name}</div>
                    <div className="text-sm text-slate-500">{d.style}</div>
                    <div className="text-sm text-slate-600">Sent {sent[d.id] || 0}× · opened {st.views}× by {st.leads} lead{st.leads === 1 ? '' : 's'} · {st.clicks} taps</div>
                    <a href={sample(d.id)} target="_blank" rel="noopener" className="mt-auto self-start rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-slate-300">Preview ↗</a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
