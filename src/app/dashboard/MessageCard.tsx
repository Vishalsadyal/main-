'use client';

import { useRef, useState } from 'react';
import { sendMessage } from './actions';

export type CardOption = { kind: string; label: string; template: string; designs: string[] };
export type CardSender = { id: string; name: string; phone: string; left: number; daily: number };
export type CardDesign = { id: string; name: string; style: string; url: string; previewUrl: string; sent: boolean;
  views?: number; seconds?: number; clicks?: number };

const linesFor = (designs: CardDesign[], ids: string[]) =>
  designs.filter((d) => ids.includes(d.id)).map((d) => `• *${d.name}*: ${d.url}`).join('\n');

/** The message for one lead: pick the message type and designs, check the text, Open WhatsApp
 *  (one WhatsApp Web tab, text filled in), press send there, then "✓ Sent" records everything. */
export default function MessageCard({ id, phone, options, initialKind, designs, back, senders = [], defaultSender }: {
  id: string;
  phone: string | null;
  options: CardOption[];
  initialKind: string;
  designs: CardDesign[];
  back?: string;
  senders?: CardSender[];
  defaultSender?: string;
}) {
  const start = options.find((o) => o.kind === initialKind) || options[0];
  const [kind, setKind] = useState(start.kind);
  const [picked, setPicked] = useState<string[]>(start.designs);
  const [opened, setOpened] = useState(false);
  const [sender, setSender] = useState(defaultSender || senders[0]?.id || 'one');
  const from = senders.find((x) => x.id === sender);
  // First messages count against each number's daily limit; replies and follow-ups don't.
  const full = (x: CardSender) => kind === 'first' && x.left <= 0;
  const area = useRef<HTMLTextAreaElement>(null);
  const option = options.find((o) => o.kind === kind) || start;
  const usesDesigns = option.template.includes('{design_links}');
  const compose = (o: CardOption, ids: string[]) => o.template.replace('{design_links}', linesFor(designs, ids) || '(pick a design below)');
  const [initialText] = useState(() => compose(start, start.designs));
  const number = (phone || '').replace(/\D/g, '');

  const setText = (text: string) => { if (area.current) area.current.value = text; };
  const choose = (o: CardOption) => {
    setKind(o.kind);
    setPicked(o.designs);
    setText(compose(o, o.designs));
  };
  const pick = (ids: string[]) => {
    const before = linesFor(designs, picked);
    setPicked(ids);
    const current = area.current?.value || '';
    const after = linesFor(designs, ids) || '(pick a design below)';
    // Keep your own edits: swap just the design lines if they're still there.
    setText(before && current.includes(before) ? current.replace(before, after) : compose(option, ids));
  };
  const toggle = (d: string) => pick(picked.includes(d) ? picked.filter((x) => x !== d) : [...picked, d]);
  const recommended = designs.filter((d) => !d.sent).slice(0, 3).map((d) => d.id);

  const openWhatsApp = () => {
    // A window per number: keep each one logged in to its own WhatsApp (e.g. Two in a second browser profile).
    window.open(`https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(area.current?.value || '')}`, `w3tech-whatsapp-${sender}`);
    setOpened(true);
  };

  return (
    <form action={sendMessage} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="demos" value={usesDesigns ? picked.join(',') : ''} />
      <input type="hidden" name="sender" value={sender} />
      {back && <input type="hidden" name="back" value={back} />}

      {options.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button type="button" key={o.kind} onClick={() => choose(o)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold ring-1 ${kind === o.kind ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-700 ring-slate-300'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {usesDesigns && designs.length > 0 && (
        <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-700">Designs to send</span>
            <button type="button" onClick={() => pick(recommended)} className="rounded-md px-2.5 py-1 text-blue-700 ring-1 ring-blue-200">Recommended 3</button>
            <button type="button" onClick={() => pick(designs.map((d) => d.id))} className="rounded-md px-2.5 py-1 text-slate-600 ring-1 ring-slate-300">All</button>
            <button type="button" onClick={() => pick([])} className="rounded-md px-2.5 py-1 text-slate-600 ring-1 ring-slate-300">None</button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {designs.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-center gap-2.5 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
                <input type="checkbox" className="h-5 w-5" checked={picked.includes(d.id)} onChange={() => toggle(d.id)} />
                <span className="flex-1">
                  <b>{d.name}</b> <span className="text-slate-500">· {d.style}</span>
                  <span className="block text-xs text-slate-500">
                    {d.sent ? 'Sent before' : 'Not sent yet'}
                    {d.views ? ` · opened ${d.views}×, ${Math.round((d.seconds || 0) / 60)} min${d.clicks ? `, ${d.clicks} taps` : ''}` : ''}
                  </span>
                </span>
                <a href={d.previewUrl} target="_blank" rel="noopener" className="text-blue-700" onClick={(e) => e.stopPropagation()}>Preview ↗</a>
              </label>
            ))}
          </div>
        </div>
      )}

      {senders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700">Send from</span>
          {senders.map((x) => (
            <button type="button" key={x.id} disabled={full(x)} onClick={() => setSender(x.id)}
              className={`rounded-lg px-3.5 py-2 font-semibold ring-1 disabled:cursor-not-allowed disabled:opacity-40 ${sender === x.id ? 'bg-green-600 text-white ring-green-600' : 'bg-white text-slate-700 ring-slate-300'}`}>
              {x.name} · {x.phone}
              <span className="ml-1.5 font-normal opacity-80">{kind === 'first' ? (x.left > 0 ? `${x.left} left today` : 'limit reached') : ''}</span>
            </button>
          ))}
          {from && <span className="text-xs text-slate-500">WhatsApp Web must be logged in as {from.phone} in this browser.</span>}
        </div>
      )}

      {(kind === 'first' || kind === 'introduction') && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          <span>📹 The intro video link (<b>w3tech.co.in/intro</b>) is in the message — WhatsApp shows it as a preview card.</span>
          <a href="/intro" target="_blank" rel="noopener" className="font-semibold text-amber-800 underline">Watch</a>
          <a href="/w3tech-intro.mp4" download="W3Tech-intro.mp4" className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-amber-300">⬇ Download</a>
        </div>
      )}

      <textarea ref={area} name="text" defaultValue={initialText} rows={8} required
        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
      <div className="flex flex-wrap gap-3">
        {number ? (
          <button type="button" onClick={openWhatsApp} className="rounded-lg bg-green-600 px-5 py-3 text-base font-semibold text-white hover:bg-green-700">
            Open WhatsApp
          </button>
        ) : <span className="self-center text-sm text-slate-500">No WhatsApp number</span>}
        <button disabled={Boolean(from && full(from))}
          className={`rounded-lg px-5 py-3 text-base font-semibold ring-1 disabled:opacity-40 ${opened ? 'bg-blue-600 text-white ring-blue-600' : 'bg-white text-slate-800 ring-slate-300'}`}>
          ✓ Sent — update everything
        </button>
      </div>
    </form>
  );
}
