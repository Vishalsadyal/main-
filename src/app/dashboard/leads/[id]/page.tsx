import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireLogin } from '@/lib/dashboard-auth';
import { getLead, LEAD_STATUSES, type LeadStatus } from '@/lib/leads-db';
import { getDesign } from '@/lib/demo-library';
import { competitors, siteUrl, engagement, getSettings, INTENTS, type MessageKind, messagesFor, mostEngaged, nextAction, shortName } from '@/lib/outreach';
import { archive, changeIntent, changeStatus, nurture, saveNote, saveReply, scheduleLater } from '../../actions';
import MessageCard from '../../MessageCard';
import { ALL_KINDS, cardFor } from '../../card';
import { StatusBadge } from '../../StatusBadge';

export const dynamic = 'force-dynamic';

const STATUS_BUTTONS: LeadStatus[] = ['waiting_reply', 'replied', 'interested', 'proposal', 'won', 'nurture', 'not_interested'];

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLogin();
  const { id } = await params;
  const found = await getLead(decodeURIComponent(id));
  if (!found) notFound();
  const { lead, history } = found;
  const conversation = (await messagesFor([lead.id]))[lead.id] || [];
  const comp = competitors(lead);
  const [settings, eng] = await Promise.all([getSettings(), engagement([lead.id])]);
  const e = eng[lead.id];
  const action = nextAction(lead, e, settings);
  const best = mostEngaged(e);
  const firstKind: MessageKind = lead.status === 'new' || lead.status === 'skipped' ? 'first' : action?.kind || 'follow_up';
  const kinds: MessageKind[] = [firstKind, ...(firstKind === 'first' ? [] : ALL_KINDS)];
  const card = cardFor(lead, settings, kinds, e);
  const self = `/dashboard/leads/${encodeURIComponent(lead.id)}`;
  const facts: [string, React.ReactNode][] = [
    ['Business type', lead.category_label],
    ['Phone', lead.phone],
    ['Address', lead.address],
    ['City', [lead.city, lead.state, lead.country].filter(Boolean).join(', ')],
    ['Website', lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700 break-all">{lead.website}</a> : 'None on the map'],
    ['Rating', lead.rating ? `★ ${lead.rating} from ${Number(lead.review_count || 0).toLocaleString('en-IN')} ${lead.rating_source || ''}` : '—'],
    ['Score', `${lead.score ?? '—'}${lead.priority ? ` · ${lead.priority} priority` : ''}`],
    ['Search rank', lead.search_rank ? `#${lead.search_rank} for “${comp.search || lead.search || ''}”` : null],
    ['Why', lead.reasons],
    ['Found by', [lead.search, lead.hunt].filter(Boolean).join(' · ')],
    ['Found on', lead.found_at && fmt(lead.found_at)],
    ['Messaged', lead.sent_at && fmt(lead.sent_at)],
    ['Follow-ups sent', lead.follow_up_count ? String(lead.follow_up_count) : null],
    ['Next follow-up', lead.next_action_at && fmt(lead.next_action_at)],
    ['Their last reply', lead.last_reply && `“${lead.last_reply.slice(0, 160)}”${lead.intent && INTENTS[lead.intent] ? ` — ${INTENTS[lead.intent].label}` : ''}`],
  ];
  const btn = 'rounded-md px-3 py-1.5 text-sm font-semibold ring-1';

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-800">← All leads</Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <StatusBadge status={lead.status} />
          {lead.archived ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">Archived</span> : null}
        </div>
        {lead.title && lead.title !== lead.name && <p className="mt-1 text-sm text-slate-500">{lead.title}</p>}
      </div>


      <section id="next" className="scroll-mt-4 rounded-xl bg-white p-5 shadow-sm ring-2 ring-blue-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Recommended next action</div>
            <h2 className="mt-1 text-xl font-bold">{action ? `${action.urgent ? '🔥 ' : ''}${action.title}` : firstKind === 'first' ? 'Send the first message' : 'Nothing due — send something if you like'}</h2>
            {action && <p className="mt-1 text-slate-600">{action.situation}</p>}
            {best && <p className="mt-1 text-sm text-green-700">Most engaged design: <b>{getDesign(best.design)?.name || best.design}</b> — opened {best.e.views}×, {Math.round(best.e.seconds / 60)} min{best.e.clicks ? `, ${best.e.clicks} WhatsApp/call taps` : ''}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className={`rounded-lg px-4 py-2.5 font-semibold ring-1 ${action?.call ? 'bg-green-600 text-white ring-green-600' : 'ring-slate-300'}`}>📞 Call now</a>}
            {action?.nurture && (
              <form action={nurture}><input type="hidden" name="id" value={lead.id} />
                <button className="rounded-lg bg-slate-800 px-4 py-2.5 font-semibold text-white">Move to nurture</button></form>
            )}
          </div>
        </div>

        <div className="mt-4"><MessageCard id={lead.id} phone={lead.whatsapp} options={card.options} initialKind={firstKind} designs={card.designs} back={self} /></div>

        {lead.status !== 'new' && (
          <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
            <form action={saveReply} className="flex flex-col gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="back" value={self} />
              <span className="text-sm font-semibold text-slate-700">They replied</span>
              <textarea name="reply" rows={3} required placeholder="Paste their WhatsApp reply…" className="rounded-lg border border-slate-300 px-3 py-2 text-base" />
              <div className="flex flex-wrap items-center gap-2">
                <select name="intent" className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">Detect what they want</option>
                  {Object.entries(INTENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white">Save reply</button>
              </div>
            </form>
            <div className="flex flex-col gap-3">
              <span className="text-sm font-semibold text-slate-700">What do they want?</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(INTENTS).filter(([k]) => k !== 'other').map(([k, v]) => (
                  <form key={k} action={changeIntent}>
                    <input type="hidden" name="id" value={lead.id} /><input type="hidden" name="intent" value={k} />
                    <button className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${lead.intent === k ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-300'}`}>{v.label}</button>
                  </form>
                ))}
              </div>
              <span className="text-sm font-semibold text-slate-700">Follow up later</span>
              <div className="flex flex-wrap gap-2">
                {[1, 3, 7, 14].map((d) => (
                  <form key={d} action={scheduleLater}>
                    <input type="hidden" name="id" value={lead.id} /><input type="hidden" name="days" value={d} />
                    <button className="rounded-lg px-3.5 py-2 text-sm font-semibold ring-1 ring-slate-300">In {d} day{d === 1 ? '' : 's'}</button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[140px_1fr]">
              {facts.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-sm font-medium text-slate-500">{k}</dt>
                  <dd className="text-sm">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              {lead.whatsapp && <a href={lead.whatsapp} target="_blank" rel="noopener" className={`${btn} bg-green-600 text-white ring-green-600`}>Open WhatsApp</a>}
              {lead.phone && <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className={`${btn} ring-slate-300`}>Call</a>}
              {lead.demo_link && <a href={lead.demo_link} target="_blank" rel="noopener" className={`${btn} ring-slate-300`}>Their website preview ↗</a>}
              {lead.maps_url && <a href={lead.maps_url} target="_blank" rel="noopener" className={`${btn} ring-slate-300`}>Map ↗</a>}
            </div>
          </section>

          {(conversation.length > 0 || lead.last_message) && (
            <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-500">WhatsApp conversation</h2>
              <div className="mt-3 flex flex-col gap-2">
                {conversation.length ? conversation.map((m) => (
                  <div key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3.5 py-2.5 text-sm ${m.dir === 'in' ? 'self-start bg-slate-100' : 'self-end bg-green-100'}`}>
                    <div className="mb-1 text-xs text-slate-500">{m.dir === 'in' ? 'They replied' : 'You'} · {fmt(m.at)}</div>
                    {m.text}
                  </div>
                )) : <p className="whitespace-pre-wrap text-sm">{lead.last_message}</p>}
              </div>
            </section>
          )}

          {card.designs.some((d) => d.sent || d.views) && (
            <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-500">Designs sent and how they engaged</h2>
              <table className="mt-2 w-full text-sm">
                <thead className="text-left text-xs uppercase text-slate-400"><tr><th className="py-1.5">Design</th><th>Sent</th><th>Opens</th><th>Time</th><th>WhatsApp / call</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {card.designs.filter((d) => d.sent || d.views).map((d) => (
                    <tr key={d.id} className={best?.design === d.id ? 'font-semibold text-green-800' : ''}>
                      <td className="py-2"><a href={d.previewUrl} target="_blank" rel="noopener" className="text-blue-700">{d.name}</a>{best?.design === d.id ? ' ⭐' : ''}</td>
                      <td>{d.sent ? '✓' : '—'}</td><td>{d.views || 0}</td><td>{Math.round((d.seconds || 0) / 60)} min</td><td>{d.clicks || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {(comp.top.length > 0 || comp.nearby.length > 0) && (
            <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-sm font-semibold text-slate-500">Competitors</h2>
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {[...comp.top.map((c) => ({ ...c, where: `#${c.rank} in search` })), ...comp.nearby.map((c) => ({ ...c, where: `${c.km} km away` }))].map((c) => (
                    <tr key={`${c.name}-${c.rank}`}>
                      <td className="py-2 font-medium">{shortName(c.name)}</td>
                      <td className="py-2 text-slate-500">{c.where}</td>
                      <td className="py-2 text-amber-700">{c.rating ? `★ ${c.rating}` : ''}</td>
                      <td className="py-2">{siteUrl(c) ? <a href={siteUrl(c)!} target="_blank" rel="noopener noreferrer nofollow" className="text-blue-700">{siteUrl(c)!.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 32)} ↗</a>
                        : c.website ? <span className="text-green-700">Has website</span> : <span className="text-slate-400">No website</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-500">Notes</h2>
            {lead.notes ? <p className="mt-2 whitespace-pre-wrap text-sm">{lead.notes}</p> : <p className="mt-2 text-sm text-slate-400">No notes yet.</p>}
            <form action={saveNote} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={lead.id} />
              <textarea name="note" rows={3} maxLength={2000} required placeholder="Add a note (call outcome, price discussed…)"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button className={`${btn} self-start bg-blue-600 text-white ring-blue-600`}>Add note</button>
            </form>
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-500">Status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {STATUS_BUTTONS.map((s) => (
                <form key={s} action={changeStatus}>
                  <input type="hidden" name="id" value={lead.id} />
                  <input type="hidden" name="status" value={s} />
                  <button disabled={lead.status === s}
                    className={`${btn} ${lead.status === s ? 'bg-slate-900 text-white ring-slate-900' : 'ring-slate-300 hover:bg-slate-50'}`}>
                    {LEAD_STATUSES[s]}
                  </button>
                </form>
              ))}
            </div>
            <form action={archive} className="mt-4 border-t border-slate-100 pt-4">
              <input type="hidden" name="id" value={lead.id} />
              <input type="hidden" name="archived" value={lead.archived ? '0' : '1'} />
              <button className={`${btn} ring-slate-300 text-slate-600 hover:bg-slate-50`}>{lead.archived ? 'Unarchive' : 'Archive'}</button>
              <p className="mt-2 text-xs text-slate-500">Leads can&apos;t be deleted. Archived leads are hidden from the list but kept forever.</p>
            </form>
          </section>

          <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-sm font-semibold text-slate-500">History</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {history.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="font-medium">{label(h.action)}{h.action === 'notes' ? '' : h.detail ? `: ${h.detail}` : ''}</div>
                  <div className="text-xs text-slate-500">{fmt(h.at)} · {h.source}</div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function label(action: string) {
  return ({ created: 'Saved', status: 'Status changed', notes: 'Note added', archived: 'Archived', unarchived: 'Unarchived', sync: 'Synced' } as Record<string, string>)[action] || action;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}
