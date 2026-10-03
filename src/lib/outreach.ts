// WhatsApp outreach from the leads dashboard — the "sales command center":
//   - settings and message texts (edited on the Settings page)
//   - the recommended next action for every lead (Action required page, lead page)
//   - the no-reply sequence: first message → follow-up 1 → follow-up 2 → final → nurture
//   - reply intent (price, call, changes…) detected from what they wrote
//   - personalised design links with per-design tracking (…&l=<lead id>)
// Messages open in WhatsApp Web with the text filled in — you press send; nothing is sent automatically.
import { getDb, type Lead, type LeadStatus, LEAD_STATUSES } from '@/lib/leads-db';
import { designsFor, getDesign, type Design } from '@/lib/demo-library';

const SITE = 'https://www.w3tech.co.in';
const DAY = 86_400_000;

// ------------------------------------------------------------------ settings

export const DEFAULT_SETTINGS = {
  dailySend: '50',
  minScore: '60',
  // Follow-up plan when they don't reply (days to wait before each message; 0 = skip that message)
  fu1Days: '2',          // first message -> follow-up 1
  fu2Days: '3',          // follow-up 1 -> follow-up 2
  finalDays: '5',        // follow-up 2 -> final message
  closeAfterDays: '3',   // final message (or last check-in) -> close as "no reply"
  keepNurture: '',       // '1' = after the final message, keep them in nurture instead of closing
  // After they replied and you answered: check in if they go quiet, then close
  dealCheck1Days: '2',
  dealCheck2Days: '3',
  nurtureDays: '30',     // check back on nurture leads after this many days
  price: '₹7,000',       // {price} — the complete package
  starterPrice: '',      // {starter_price} — optional cheaper option (empty = same as {price})
  myName: 'W3Tech',
  openLine: 'Please feel free to message or call me anytime — happy to talk about anything, even if you just have questions. No pressure at all. 🙂',

  // ---- first contact
  first:
    'Hi {name} 🙏\n\n' +
    'I came across {name} on the map{in_city} and {pitch}\n\n' +
    '{competitor_line}' +
    'Every day, people near you search online for exactly what you offer. When they can\'t find you, many of them call ' +
    'someone else — even when your service is better.\n\n' +
    'So I made a free preview of how your business could look online — with your name on it, and buttons so customers can call or ' +
    'WhatsApp you in one tap:\n{design_links}\n\n' +
    'No cost to look. If you like it, I\'ll make it fully yours — your photos, services and timings.\n\n' +
    '{open_line}\n\n' +
    '— {my_name}',

  // ---- no reply: gentle follow-ups
  followup_1:
    'Hi {name}, hope your day is going well! 🙂\n\n' +
    'I made a few more designs for you — have a look and see which one feels most like you:\n{design_links}\n\n' +
    'You have built something people trust. A website is simply where new customers discover it first.\n\n{open_line}',
  followup_2:
    'Hi {name} 🙏\n\n{competitor_links}' +
    'Most people now simply search “near me” on Google and pick from the first few results — they check timings, ' +
    'location, photos and reviews. When they can\'t find that for you, they choose whoever they can find.\n\n' +
    'You\'ve already done the hard part: the quality and the trust. A website just makes sure people can see it.\n\n' +
    'Your preview is still ready:\n{design_links}\n\n{open_line}',
  followup_final:
    'Hi {name}, this will be my last message — I don\'t want to disturb you. 🙏\n\n' +
    'I genuinely believe your work deserves to be found online. If budget was the worry: our complete package is just ' +
    '{starter_price} — website, domain, hosting, Google & Apple Maps setup, everything included for the first year.\n\n' +
    'Your design stays ready whenever you are:\n{design_links}\n\nIf you ever want to talk — about this or anything else — I\'m just a message away. ' +
    'Wishing you lots of growth! 🌱',

  // ---- after they reply
  more_designs:
    'Thank you for replying, {name}! 😊 Really happy to hear from you.\n\n' +
    'Here are a few designs made with your name — tap any to see how you could look online:\n{design_links}\n\n' +
    'Tell me which one you like, and I\'ll shape it around your services, your photos and the way you look after your customers.\n\n{open_line}',
  pricing:
    'Thank you for asking, {name}! 😊\n\n' +
    'Here is everything we do to get you fully online — one price, *{price}*, no hidden costs:\n\n' +
    '🌐 *Your website*\n' +
    '• Professional design that works perfectly on mobile and computer\n' +
    '• Home, About, Services and Contact pages\n' +
    '• WhatsApp, Call and Google Maps buttons\n' +
    '• Photo gallery and contact form, linked to your social media\n\n' +
    '🔒 *Domain, hosting and security — 1 year included*\n' +
    '• Your own web address (like yourname.com)\n' +
    '• Fast hosting with SSL (the secure 🔒)\n' +
    '• Business email setup, where your plan supports it\n\n' +
    '📍 *Get found on Google and maps*\n' +
    '• Google Business Profile setup and improvement, so you show up for “near me” searches\n' +
    '• ⭐ Review boost: your own Google review link + QR code for your counter, and ready messages to ask happy ' +
    'customers — we help you reach 50 genuine reviews, which helps you rank higher on Google Maps\n' +
    '• Apple Maps (Apple Business Connect) setup\n' +
    '• Basic local SEO, Google Search Console and indexing\n\n' +
    '🤝 *After launch*\n' +
    '• 30 days support for small changes\n' +
    '• Website backup\n\n' +
    'My aim isn\'t just to sell a website — it\'s to make sure that when someone in {area} searches for what you do, ' +
    'they find *you*.\n\n' +
    'If anything in the package isn\'t clear, or you\'d like something different, please tell me — we can talk it through ' +
    'and find what works best for you. 🙂\n\nShall we start? Your first version can be ready in 2–3 days.',
  call:
    'Of course, {name}! I\'ll call you shortly. 📞\n\nIf another time suits you better, just tell me — happy to work around your schedule.',
  changes:
    'Absolutely, {name}! This is *your* website — it should feel exactly like you. 😊\n\n' +
    'Tell me what you\'d like: colours, photos, services, wording — anything.\n\n' +
    'Here are the designs again so we can pick a starting point:\n{design_links}\n\n{open_line}',
  portfolio:
    'Sure, {name}! Here are designs we\'ve made for businesses like yours:\n{design_links}\n\n' +
    'You can see more of our work at https://www.w3tech.co.in — every website we build is shaped around the owner\'s ' +
    'goals, not copied from a template.\n\n{open_line}',
  timeline:
    'Hi {name}! Once you share your photos and details, your first version is ready in *2–3 days*, and the full website — ' +
    'domain, Google and Apple Maps included — goes live in about a week. 🚀\n\n' +
    'You focus on your customers; we take care of everything technical.\n\n{open_line}',
  follow_up:
    'Hi {name}, just checking in 🙂 Did you get a chance to look at the design and the package?\n\n' +
    'If you have any questions, or want anything changed, I\'m happy to help — or we can have a quick 5-minute call.\n\n{open_line}',
  not_now:
    'Completely understand, {name} 🙏 Running a business keeps you busy.\n\n' +
    'I\'ll keep your design ready — whenever the time is right, just message me here and we\'ll get you online. ' +
    'And if you want to talk anything through before deciding, I\'m always happy to. 🙂',
  not_interested:
    'Thank you for letting me know, {name} 🙏 I won\'t message again.\n\n' +
    'Wishing you and your team lots of success — and if you ever need help online, I\'m just a message away.',
  onboarding:
    'Wonderful, {name}! 🎉 Thank you for trusting us — we\'ll take good care of it.\n\n' +
    'To get started, please send:\n' +
    '1️⃣ Your logo (if you have one)\n' +
    '2️⃣ A few photos of your clinic / shop / work\n' +
    '3️⃣ Your services and timings\n' +
    '4️⃣ Address and the phone number to show\n\n' +
    'Your first version will be ready in 2–3 days. Let\'s get you online! 🚀',
};
export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type Settings = Record<SettingKey, string>;

export async function getSettings(): Promise<Settings> {
  const conn = await getDb();
  const rows = await conn.execute('SELECT key, value FROM settings');
  const out = { ...DEFAULT_SETTINGS } as Settings;
  for (const r of rows.rows) if (String(r.key) in out) out[String(r.key) as SettingKey] = String(r.value);
  return out;
}

/** Back to the default texts for every message (your price, limits and name are kept). */
export async function resetMessageTexts(): Promise<void> {
  const conn = await getDb();
  const keys = Object.keys(MESSAGES);
  await conn.execute({ sql: `DELETE FROM settings WHERE key IN (${keys.map(() => '?').join(',')})`, args: keys });
}

export async function saveSettings(values: Partial<Settings>): Promise<void> {
  const conn = await getDb();
  for (const [key, value] of Object.entries(values)) {
    if (!(key in DEFAULT_SETTINGS) || value === undefined) continue;
    if (value.trim() === DEFAULT_SETTINGS[key as SettingKey].trim()) {
      // Same as the default: don't store it, so improved default texts reach you automatically.
      await conn.execute({ sql: 'DELETE FROM settings WHERE key = ?', args: [key] });
      continue;
    }
    await conn.execute({
      sql: `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      args: [key, String(value).slice(0, 5000), new Date().toISOString()],
    });
  }
}

// ------------------------------------------------------------------ message kinds

export type MessageKind = Exclude<SettingKey, 'dailySend' | 'minScore' | 'fu1Days' | 'fu2Days' | 'finalDays' | 'closeAfterDays' |
  'keepNurture' | 'dealCheck1Days' | 'dealCheck2Days' | 'nurtureDays' | 'price' | 'starterPrice' | 'myName' | 'openLine'>;

/** Every message you can send, what it's called, how many designs it includes by default,
 *  and the stage the lead moves to once it's sent. */
export const MESSAGES: Record<MessageKind, { label: string; designs: number; advance: LeadStatus | null }> = {
  first: { label: 'First message', designs: 1, advance: 'waiting_reply' },
  followup_1: { label: 'Follow-up 1 · more designs', designs: 3, advance: null },
  followup_2: { label: 'Follow-up 2 · competitors', designs: 1, advance: null },
  followup_final: { label: 'Final follow-up · budget', designs: 1, advance: null },
  more_designs: { label: 'Send designs', designs: 3, advance: 'interested' },
  pricing: { label: 'Send pricing', designs: 0, advance: 'proposal' },
  call: { label: 'Reply to call request', designs: 0, advance: null },
  changes: { label: 'Changes requested', designs: 3, advance: 'interested' },
  portfolio: { label: 'Send portfolio', designs: 3, advance: 'interested' },
  timeline: { label: 'Send timeline', designs: 0, advance: null },
  follow_up: { label: 'Check in', designs: 0, advance: null },
  not_now: { label: 'Not right now', designs: 0, advance: null },
  not_interested: { label: 'Close politely', designs: 0, advance: 'not_interested' },
  onboarding: { label: 'Onboarding (said yes)', designs: 0, advance: 'won' },
};
const SEQUENCE: MessageKind[] = ['followup_1', 'followup_2', 'followup_final'];
const IN_DEAL = ['replied', 'interested', 'proposal'];

const days = (v: string, fallback: number) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** The follow-up plan from Settings: when they haven't replied (follow-up 1, 2, final) or,
 *  once they replied and you answered, the check-ins if they go quiet. Steps set to 0 days are skipped. */
export function followUpPlan(s: Settings, afterReply: boolean): { kind: MessageKind; days: number; label: string }[] {
  const steps = afterReply
    ? [{ kind: 'follow_up' as MessageKind, days: days(s.dealCheck1Days, 2), label: 'Check-in 1' },
       { kind: 'follow_up' as MessageKind, days: days(s.dealCheck2Days, 3), label: 'Check-in 2' }]
    : [{ kind: 'followup_1' as MessageKind, days: days(s.fu1Days, 2), label: MESSAGES.followup_1.label },
       { kind: 'followup_2' as MessageKind, days: days(s.fu2Days, 3), label: MESSAGES.followup_2.label },
       { kind: 'followup_final' as MessageKind, days: days(s.finalDays, 5), label: MESSAGES.followup_final.label }];
  return steps.filter((x) => x.days > 0);
}

/** Leads whose plan ran out without a reply are closed ("Closed — no reply") — no more time spent on them.
 *  A reply or a new design open brings them back. */
export async function autoClose(): Promise<number> {
  const conn = await getDb();
  const now = new Date().toISOString();
  const res = await conn.execute({
    sql: `SELECT id, status FROM leads WHERE closing = 1 AND archived = 0 AND status IN ('waiting_reply','replied','interested','proposal')
          AND next_action_at <= ?`,
    args: [now],
  });
  for (const r of res.rows) {
    await conn.execute({ sql: "UPDATE leads SET status = 'no_reply', closing = 0, next_action_at = NULL, updated_at = ? WHERE id = ?", args: [now, r.id] });
    await conn.execute({
      sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'closed', ?, 'dashboard')",
      args: [r.id, r.status === 'waiting_reply' ? 'No reply after the follow-ups — closed automatically' : 'Went quiet after replying — closed automatically'],
    });
  }
  return res.rows.length;
}

// ------------------------------------------------------------------ reply intent

export const INTENTS: Record<string, { label: string; kind: MessageKind; action: string }> = {
  price: { label: 'Asked the price', kind: 'pricing', action: 'Send pricing' },
  call: { label: 'Wants a call', kind: 'call', action: 'Call them' },
  changes: { label: 'Wants changes', kind: 'changes', action: 'Send updated designs' },
  portfolio: { label: 'Wants examples', kind: 'portfolio', action: 'Send portfolio' },
  timeline: { label: 'Asked how long', kind: 'timeline', action: 'Send timeline' },
  thinking: { label: 'Thinking / later', kind: 'not_now', action: 'Reply and follow up later' },
  interested: { label: 'Interested', kind: 'more_designs', action: 'Send designs & next steps' },
  yes: { label: 'Said yes', kind: 'onboarding', action: 'Start onboarding' },
  not_interested: { label: 'Not interested', kind: 'not_interested', action: 'Close politely' },
  other: { label: 'Other', kind: 'more_designs', action: 'Reply' },
};

/** Best guess at what a reply asks for (English + common Hinglish). You can override it. */
export function detectIntent(text: string): keyof typeof INTENTS {
  const t = ` ${(text || '').toLowerCase()} `;
  const has = (re: RegExp) => re.test(t);
  if (has(/not interested|no thanks|no thank|don'?t (message|contact)|stop|nahi chahiye|mat bhejo|not required|no need/)) return 'not_interested';
  if (has(/price|cost|charges?|rate|how much|kitna|kitne|budget|fees?|amount|package/)) return 'price';
  if (has(/\bcall\b|phone|ring me|baat kar|call kar|contact me/)) return 'call';
  if (has(/change|modify|edit|different colou?r|logo|photo|customi[sz]e|badal/)) return 'changes';
  if (has(/portfolio|example|sample|previous work|your work|clients?/)) return 'portfolio';
  if (has(/how long|kab tak|when will|timeline|days|time lagega|kitne din/)) return 'timeline';
  if (has(/later|think|discuss|partner|busy|next month|baad me|sochta|soch ke|abhi nahi/)) return 'thinking';
  if (has(/\b(yes|ok|okay|done|go ahead|let'?s start|haan|ha ji|theek|start)\b/)) return 'yes';
  if (has(/interested|nice|good|great|like it|accha|badhiya|sundar/)) return 'interested';
  return 'other';
}

// ------------------------------------------------------------------ names, links, competitors

const FILLER = /^(super|specialit?y|specialty|multi|multi-?speciality|multispecialit?y|multispecialty|best|advanced|premium|top|#1)$/i;
const JOINERS = /^(and|&|of|the|for|in|at|by|with|-|–|\+|,)$/i;
export function shortName(name: string, max = 30): string {
  const clean = (name || '').normalize('NFKC').split(/\s?[-–|:]\s|\s*[|/(]/)[0].replace(/\s+/g, ' ').trim() || name;
  if (clean.length <= max) return clean;
  const trimmed = clean.split(' ').filter((w) => !FILLER.test(w)).join(' ');
  if (trimmed && trimmed.length <= max) return trimmed;
  const kept: string[] = [];
  for (const w of (trimmed || clean).split(' ')) {
    if ([...kept, w].join(' ').length > max) break;
    kept.push(w);
  }
  while (kept.length > 1 && JOINERS.test(kept[kept.length - 1])) kept.pop();
  return kept.join(' ').replace(/[,&+–-]+$/, '').trim() || clean.slice(0, max);
}

const slugify = (t: string) => t.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

export type DesignLink = Design & { url: string; previewUrl: string; sent: boolean };

/** The designs that suit a lead, with personalised links: `url` is sent to them and tracked
 *  (…&l=<lead id>); `previewUrl` is for you and isn't counted as their view. */
export function designLinks(lead: Lead): DesignLink[] {
  const own = (lead.demo_link || '').match(/\/for\/([a-z]+)\//)?.[1] || null;
  const base = (lead.demo_link || '').match(/^(https?:\/\/[^/]+)\/for\//)?.[1] || SITE;
  const name = shortName(lead.name);
  const phone = (lead.whatsapp || '').replace(/\D/g, '');
  const sent = new Set(jsonList(lead.demos_sent));
  return designsFor(lead.category, own).map((d) => {
    const p = new URLSearchParams({ n: name });
    if (lead.city) p.set('c', lead.city);
    if (phone) p.set('p', phone);
    const path = `${base}/for/${d.id}/${slugify(`${name} ${lead.city || ''}`) || 'preview'}`;
    const preview = `${path}?${p.toString()}`;
    p.set('l', lead.id);
    return { ...d, url: `${path}?${p.toString()}`, previewUrl: preview, sent: sent.has(d.id) };
  });
}

/** Default designs for a message: ones not sent yet first, then the rest. */
export function defaultDesigns(lead: Lead, kind: MessageKind): string[] {
  const n = MESSAGES[kind]?.designs ?? 0;
  if (!n) return [];
  const links = designLinks(lead);
  const fresh = links.filter((d) => !d.sent);
  return [...fresh, ...links.filter((d) => d.sent)].slice(0, n).map((d) => d.id);
}

function jsonList(v: string | null): string[] {
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.map(String) : []; } catch { return []; }
}

type Competitor = { name: string; rank: number | null; website: string | boolean; rating: number | null; reviews: number | null;
  km: number | null; ratingSource?: string | null };
export const hasSite = (c: Competitor) => Boolean(c.website);
export const siteUrl = (c: Competitor) => (typeof c.website === 'string' && /^https?:\/\//.test(c.website) ? c.website : null);
export function competitors(lead: Pick<Lead, 'competitors'>): { top: Competitor[]; nearby: Competitor[]; search: string | null } {
  try {
    const d = JSON.parse(lead.competitors || '');
    return { top: d.top || [], nearby: d.nearby || [], search: d.search || null };
  } catch {
    return { top: [], nearby: [], search: null };
  }
}

/** One sentence about competitors that already have a website, if there is one worth saying. */
export function competitorLine(lead: Lead): string {
  if (lead.website) return '';
  const c = competitors(lead);
  const near = c.nearby.filter((x) => hasSite(x) && x.km != null && x.km <= 5).sort((a, b) => (a.km || 0) - (b.km || 0))[0];
  const top = c.top.filter(hasSite).slice(0, 2);
  if (top.length && lead.search_rank && lead.search_rank > 3) {
    const names = top.map((x) => `${shortName(x.name)}${x.rating ? ` (★${x.rating})` : ''}`).join(' and ');
    return `When people search “${c.search || 'for you'}”, ${names} show up first — and they already have websites.\n\n`;
  }
  if (near) return `${shortName(near.name)}, ${near.km} km from you, already has a website — let's make sure people find you too.\n\n`;
  return '';
}

/** Competitors near the lead that have a website — top of the map search first, then the nearest —
 *  with their rating and a link to their site, for {competitor_links}. */
export function competitorLinks(lead: Lead, max = 3): string {
  const c = competitors(lead);
  const seen = new Set<string>();
  const list = [...c.top.filter(hasSite), ...c.nearby.filter(hasSite).sort((a, b) => (a.km ?? 99) - (b.km ?? 99))]
    .filter((x) => !seen.has(x.name) && Boolean(seen.add(x.name))).slice(0, max);
  return list.map((x) => {
    const where = x.rank && x.rank <= 3 ? `#${x.rank} when people search “${c.search || 'nearby'}”` : x.km != null ? `${x.km} km from you` : '';
    const rating = x.rating ? `★${x.rating}${x.reviews ? ` (${Number(x.reviews).toLocaleString('en-IN')} reviews)` : ''}` : '';
    const link = siteUrl(x);
    return `• ${shortName(x.name)}${[rating, where].filter(Boolean).length ? ` — ${[rating, where].filter(Boolean).join(', ')}` : ''}${link ? `\n  ${link}` : ''}`;
  }).join('\n');
}

/** The message with everything filled in except {design_links}, which the dashboard fills from
 *  the designs you tick. */
export function messageTemplate(kind: MessageKind, lead: Lead, settings: Settings): string {
  const name = shortName(lead.name);
  const city = lead.city || '';
  const values: Record<string, string> = {
    name, city, area: city || 'your area',
    in_city: city && !name.toLowerCase().includes(city.toLowerCase()) ? ` in ${city}` : '',
    pitch: !lead.website ? "noticed you don't have a website yet." : 'had a look at your website.',
    competitor_line: competitorLine(lead),
    // The list with links when we have it; otherwise the one-sentence version (older leads).
    competitor_links: competitorLinks(lead)
      ? `Businesses near you that customers already find online:\n${competitorLinks(lead)}\n\n`
      : competitorLine(lead),
    demo_link: designLinks(lead)[0]?.url || lead.demo_link || SITE,
    price: settings.price || '[your price]',
    starter_price: settings.starterPrice || settings.price || '[price]',
    my_name: settings.myName || 'W3Tech',
    open_line: settings.openLine || DEFAULT_SETTINGS.openLine,
  };
  return (settings[kind] || DEFAULT_SETTINGS[kind]).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m)).trim();
}

export function withDesigns(template: string, lead: Lead, ids: string[]): string {
  const links = designLinks(lead).filter((d) => ids.includes(d.id)).map((d) => `• ${d.name}: ${d.url}`).join('\n');
  return template.replace('{design_links}', links || designLinks(lead)[0]?.url || lead.demo_link || SITE);
}

export function fillMessage(kind: MessageKind, lead: Lead, settings: Settings, ids?: string[]): string {
  return withDesigns(messageTemplate(kind, lead, settings), lead, ids ?? defaultDesigns(lead, kind));
}

// ------------------------------------------------------------------ design engagement

export type Engagement = { views: number; seconds: number; clicks: number; lastAt: string | null };

export async function engagement(leadIds: string[]): Promise<Record<string, Record<string, Engagement>>> {
  if (!leadIds.length) return {};
  const conn = await getDb();
  const res = await conn.execute({
    sql: `SELECT lead_id, design,
            SUM(CASE WHEN event = 'view' THEN 1 ELSE 0 END) views,
            SUM(CASE WHEN event = 'leave' THEN COALESCE(seconds, 0) ELSE 0 END) seconds,
            SUM(CASE WHEN event IN ('whatsapp', 'call', 'cta') THEN 1 ELSE 0 END) clicks,
            MAX(at) last_at
          FROM demo_events WHERE lead_id IN (${leadIds.map(() => '?').join(',')}) GROUP BY lead_id, design`,
    args: leadIds,
  });
  const out: Record<string, Record<string, Engagement>> = {};
  for (const r of res.rows) {
    (out[String(r.lead_id)] ||= {})[String(r.design)] = {
      views: Number(r.views), seconds: Number(r.seconds), clicks: Number(r.clicks), lastAt: r.last_at ? String(r.last_at) : null,
    };
  }
  return out;
}

export function mostEngaged(e: Record<string, Engagement> | undefined): { design: string; e: Engagement } | null {
  const best = Object.entries(e || {}).sort(([, a], [, b]) => b.clicks * 100 + b.seconds + b.views * 10 - (a.clicks * 100 + a.seconds + a.views * 10))[0];
  return best && best[1].views ? { design: best[0], e: best[1] } : null;
}

// ------------------------------------------------------------------ recommended next action

export type NextAction = {
  title: string;        // what to do
  situation: string;    // why
  kind: MessageKind | null;
  urgent: boolean;
  call?: boolean;       // show a "Call now" button
  nurture?: boolean;    // offer "Move to nurture"
  addReply?: boolean;   // their reply isn't saved yet: ask for it
};

const ago = (iso: string | null) => {
  if (!iso) return '';
  const d = Math.floor((Date.now() - Date.parse(iso)) / DAY);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

export function nextAction(lead: Lead, e: Record<string, Engagement> | undefined, s: Settings): NextAction | null {
  const now = Date.now();
  const due = !lead.next_action_at || Date.parse(lead.next_action_at) <= now;
  const contacted = lead.last_contacted_at ? Date.parse(lead.last_contacted_at) : 0;
  // The design they looked at most recently (any design) — "did they open something since my last message?"
  const recent = Object.entries(e || {}).filter(([, x]) => x.lastAt && x.views)
    .sort(([, a], [, b]) => Date.parse(b.lastAt!) - Date.parse(a.lastAt!))[0];
  const openedSince = Boolean(recent && Date.parse(recent[1].lastAt!) > contacted);
  const designName = recent ? getDesign(recent[0])?.name || recent[0] : '';
  const seen = recent?.[1];
  const step = lead.follow_up_count || 0;

  switch (lead.status) {
    case 'waiting_reply': {
      if (openedSince && seen) {
        return { title: `Follow up — they opened ${designName}`, urgent: true, kind: followUpPlan(s, false)[step]?.kind || 'follow_up',
          situation: `Opened ${designName} ${seen.views}× (${Math.round(seen.seconds / 60)} min)${seen.clicks ? `, tapped WhatsApp/call ${seen.clicks}×` : ''} · no reply yet` };
      }
      if (!due || lead.closing) return null;
      const plan = followUpPlan(s, false);
      if (step >= plan.length) return null;
      return { title: plan[step].label, situation: `No reply · last message ${ago(lead.last_contacted_at)}`, kind: plan[step].kind, urgent: false };
    }
    case 'replied':
    case 'interested':
    case 'proposal': {
      const intent = INTENTS[lead.intent || ''] || null;
      const answered = lead.last_contacted_at && lead.last_reply_at && Date.parse(lead.last_contacted_at) > Date.parse(lead.last_reply_at);
      if (!answered && intent) {
        return { title: intent.action, situation: `${intent.label}: “${(lead.last_reply || '').slice(0, 80)}”`, kind: intent.kind,
                 urgent: true, call: lead.intent === 'call' };
      }
      if (!answered && lead.last_reply) {
        return { title: 'Reply to them', situation: `They replied: “${lead.last_reply.slice(0, 80)}”`, kind: 'more_designs', urgent: true };
      }
      // Marked "replied" (e.g. from the extension) but their message was never saved.
      if (lead.status === 'replied' && !lead.last_reply && !lead.intent) {
        return { title: 'Add what they replied', urgent: true, kind: 'more_designs', addReply: true,
                 situation: 'Marked as replied, but their message isn’t saved — paste it so the next step fits what they asked' };
      }
      if (!due || lead.closing) return null;
      const plan = followUpPlan(s, true);
      if (step >= plan.length) return null;
      return { title: `${lead.status === 'proposal' ? 'Follow up on the price' : 'Check in'} (${step + 1} of ${plan.length})`, kind: 'follow_up',
               urgent: false, situation: `No answer since your message ${ago(lead.last_contacted_at)}` };
    }
    case 'won': // after onboarding is sent there's nothing automatic left; a date you schedule still shows up
      return lead.next_action_at && due ? { title: 'Check in', situation: 'Won client', kind: 'follow_up', urgent: false } : null;
    case 'no_reply': // closed — but they came back to look at the design
      return openedSince && seen ? { title: `They're back — opened ${designName}`, urgent: true, kind: 'follow_up',
        situation: `Closed for no reply, then opened ${designName} ${seen.views}× · a good moment to say hello` } : null;
    case 'nurture':
      return due ? { title: 'Nurture check-in', situation: `No reply to the sequence · last message ${ago(lead.last_contacted_at)}`, kind: 'follow_up', urgent: false } : null;
    default:
      return null;
  }
}

/** Leads that need something now, most urgent first. */
export async function actionList(): Promise<{ lead: Lead; action: NextAction; e: Record<string, Engagement> | undefined }[]> {
  await autoClose();
  const conn = await getDb();
  const s = await getSettings();
  const res = await conn.execute(`SELECT * FROM leads l WHERE archived = 0 AND status IN ('waiting_reply','replied','interested','proposal','won','nurture','no_reply')
    AND (next_action_at IS NULL OR next_action_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
         OR (last_reply_at IS NOT NULL AND (last_contacted_at IS NULL OR last_reply_at > last_contacted_at))
         OR (status = 'replied' AND last_reply IS NULL AND intent IS NULL)
         OR EXISTS (SELECT 1 FROM demo_events e WHERE e.lead_id = l.id AND e.at > COALESCE(l.last_contacted_at, '')))
    ORDER BY updated_at DESC LIMIT 300`);
  const leads = res.rows as unknown as Lead[];
  const eng = await engagement(leads.map((l) => l.id));
  const out: { lead: Lead; action: NextAction; e: Record<string, Engagement> | undefined }[] = [];
  for (const lead of leads) {
    const action = nextAction(lead, eng[lead.id], s);
    if (action) out.push({ lead, action, e: eng[lead.id] });
  }
  return out.sort((a, b) => Number(b.action.urgent) - Number(a.action.urgent));
}

// ------------------------------------------------------------------ today's list

function istDayStart(): string {
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600_000).toISOString();
}

export async function sentToday(): Promise<number> {
  const conn = await getDb();
  const r = await conn.execute({ sql: "SELECT COUNT(*) n FROM lead_messages WHERE dir = 'out' AND kind = 'first' AND at >= ?", args: [istDayStart()] });
  return Number(r.rows[0].n);
}

export async function todayList(): Promise<{ leads: Lead[]; sent: number; limit: number; available: number }> {
  const s = await getSettings();
  const conn = await getDb();
  const limit = Math.max(0, Math.min(200, parseInt(s.dailySend, 10) || 50));
  const sent = await sentToday();
  const where = `archived = 0 AND status = 'new' AND whatsapp IS NOT NULL AND whatsapp <> '' AND COALESCE(score, 0) >= ?`;
  const minScore = parseInt(s.minScore, 10) || 0;
  const available = Number((await conn.execute({ sql: `SELECT COUNT(*) n FROM leads WHERE ${where}`, args: [minScore] })).rows[0].n);
  const res = await conn.execute({
    sql: `SELECT * FROM leads WHERE ${where} ORDER BY score DESC, COALESCE(review_count, 0) DESC, created_at ASC LIMIT ?`,
    args: [minScore, Math.max(0, limit - sent)],
  });
  return { leads: res.rows as unknown as Lead[], sent, limit, available };
}

// ------------------------------------------------------------------ recording what happened

export type Message = { id: number; lead_id: string; at: string; dir: 'in' | 'out'; kind: string | null; text: string; demos: string | null };

export async function messagesFor(leadIds: string[]): Promise<Record<string, Message[]>> {
  if (!leadIds.length) return {};
  const conn = await getDb();
  const res = await conn.execute({
    sql: `SELECT * FROM lead_messages WHERE lead_id IN (${leadIds.map(() => '?').join(',')}) ORDER BY id`,
    args: leadIds,
  });
  const out: Record<string, Message[]> = {};
  for (const m of res.rows as unknown as Message[]) (out[m.lead_id] ||= []).push(m);
  return out;
}

const RANK: Record<string, number> = { new: 0, waiting_reply: 1, nurture: 1, no_reply: 1, replied: 2, interested: 3, proposal: 4, won: 5 };

/** One action, everything updated: message log, stage, follow-up count, last contact,
 *  next follow-up date, designs sent and the timeline. */
export async function recordSent(id: string, text: string, kind: MessageKind, demos: string[]): Promise<void> {
  const conn = await getDb();
  const cur = await conn.execute({ sql: 'SELECT status, follow_up_count, demos_sent FROM leads WHERE id = ?', args: [id] });
  if (!cur.rows.length) throw new Error('Lead not found');
  const row = cur.rows[0];
  const s = await getSettings();
  const now = new Date();
  const status = String(row.status);
  const advance = MESSAGES[kind]?.advance ?? null;
  // Forward only; "not interested" and "nurture" (end of the no-reply sequence) are always allowed.
  const next = advance && (advance === 'not_interested' || (advance === 'nurture' && status === 'waiting_reply') || (RANK[advance] ?? 0) > (RANK[status] ?? 0))
    ? advance : status;
  // Follow-up count = steps of the current plan already sent (reset when they reply).
  const isStep = next === 'waiting_reply' ? SEQUENCE.includes(kind) : IN_DEAL.includes(next) && kind === 'follow_up';
  const followUps = kind === 'first' ? 0 : Number(row.follow_up_count || 0) + (isStep ? 1 : 0);
  const at = (d: number) => new Date(now.getTime() + d * DAY).toISOString();
  let nextAt: string | null = null;
  let closing = 0;
  let finalStatus = next;
  if (next === 'nurture') {
    nextAt = at(days(s.nurtureDays, 30));
  } else if (next === 'waiting_reply' || IN_DEAL.includes(next)) {
    const plan = followUpPlan(s, next !== 'waiting_reply');
    if (followUps < plan.length) {
      nextAt = at(plan[followUps].days);
    } else if (next === 'waiting_reply' && s.keepNurture === '1') {
      finalStatus = 'nurture';
      nextAt = at(days(s.nurtureDays, 30));
    } else {
      closing = 1; // plan finished: close as "no reply" if nothing happens by then
      nextAt = at(days(s.closeAfterDays, 3));
    }
  }
  const allDemos = [...new Set([...jsonList(row.demos_sent as string | null), ...demos])];
  await conn.execute({
    sql: "INSERT INTO lead_messages (lead_id, dir, kind, text, demos) VALUES (?, 'out', ?, ?, ?)",
    args: [id, kind, text.slice(0, 5000), demos.length ? JSON.stringify(demos) : null],
  });
  await conn.execute({
    sql: `UPDATE leads SET status = ?, last_message = ?, sent_at = COALESCE(sent_at, ?), last_contacted_at = ?, follow_up_count = ?,
          next_action_at = ?, closing = ?, demos_sent = ?, updated_at = ? WHERE id = ?`,
    args: [finalStatus, text.slice(0, 3000), now.toISOString(), now.toISOString(), followUps, nextAt, closing, JSON.stringify(allDemos),
           now.toISOString(), id],
  });
  await conn.execute({
    sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'message', ?, 'dashboard')",
    args: [id, `${MESSAGES[kind]?.label || kind}${demos.length ? ` · designs: ${demos.map((d) => getDesign(d)?.name || d).join(', ')}` : ''}`],
  });
}

/** Their reply: stops the follow-up sequence, detects what they want, and makes it due now. */
export async function recordReply(id: string, text: string, intent?: string): Promise<string> {
  const conn = await getDb();
  const now = new Date().toISOString();
  const detected = intent && intent in INTENTS ? intent : detectIntent(text);
  await conn.execute({ sql: "INSERT INTO lead_messages (lead_id, dir, kind, text) VALUES (?, 'in', ?, ?)", args: [id, detected, text.slice(0, 5000)] });
  await conn.execute({
    sql: `UPDATE leads SET last_reply = ?, last_reply_at = ?, intent = ?, next_action_at = ?, updated_at = ?, follow_up_count = 0, closing = 0,
          status = CASE WHEN status IN ('new', 'queued', 'waiting_reply', 'nurture', 'no_reply') THEN 'replied' ELSE status END WHERE id = ?`,
    args: [text.slice(0, 3000), now, detected, now, now, id],
  });
  await conn.execute({
    sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'reply', ?, 'dashboard')",
    args: [id, `${INTENTS[detected].label}: ${text.slice(0, 200)}`],
  });
  return detected;
}

export async function setIntent(id: string, intent: string): Promise<void> {
  if (!(intent in INTENTS)) throw new Error('Unknown intent');
  const conn = await getDb();
  const now = new Date().toISOString();
  await conn.execute({ sql: 'UPDATE leads SET intent = ?, next_action_at = ?, updated_at = ? WHERE id = ?', args: [intent, now, now, id] });
}

export async function scheduleFollowUp(id: string, days: number): Promise<void> {
  const conn = await getDb();
  const at = new Date(Date.now() + Math.max(0, days) * DAY).toISOString();
  await conn.execute({ sql: 'UPDATE leads SET next_action_at = ?, closing = 0, updated_at = ? WHERE id = ?', args: [at, new Date().toISOString(), id] });
  await conn.execute({
    sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'scheduled', ?, 'dashboard')",
    args: [id, `Follow up in ${days} day${days === 1 ? '' : 's'}`],
  });
}

export async function moveToNurture(id: string): Promise<void> {
  const conn = await getDb();
  const s = await getSettings();
  const at = new Date(Date.now() + (parseInt(s.nurtureDays, 10) || 30) * DAY).toISOString();
  await conn.execute({ sql: "UPDATE leads SET status = 'nurture', next_action_at = ?, updated_at = ? WHERE id = ?", args: [at, new Date().toISOString(), id] });
}

// ------------------------------------------------------------------ funnel

export async function funnel(): Promise<{ status: string; label: string; count: number }[]> {
  await autoClose();
  const conn = await getDb();
  const r = (
    await conn.execute(`SELECT
      SUM(CASE WHEN status IN ('waiting_reply','nurture','no_reply','replied','interested','proposal','won','not_interested') THEN 1 ELSE 0 END) sent,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM demo_events e WHERE e.lead_id = l.id AND e.event = 'view') THEN 1 ELSE 0 END) opened,
      SUM(CASE WHEN (last_reply IS NOT NULL OR status IN ('replied','interested','proposal','won')) THEN 1 ELSE 0 END) replied,
      SUM(CASE WHEN status IN ('interested','proposal','won') THEN 1 ELSE 0 END) designs,
      SUM(CASE WHEN status IN ('proposal','won') THEN 1 ELSE 0 END) pricing,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) won,
      SUM(CASE WHEN status = 'nurture' THEN 1 ELSE 0 END) nurture,
      SUM(CASE WHEN status = 'not_interested' THEN 1 ELSE 0 END) lost,
      SUM(CASE WHEN status = 'no_reply' THEN 1 ELSE 0 END) closed
      FROM leads l WHERE archived = 0`)
  ).rows[0];
  const n = (k: string) => Number(r[k] ?? 0);
  return [
    { status: 'waiting_reply', label: 'Messaged', count: n('sent') },
    { status: 'opened', label: 'Opened a design', count: n('opened') },
    { status: 'replied', label: 'Replied', count: n('replied') },
    { status: 'interested', label: LEAD_STATUSES.interested, count: n('designs') },
    { status: 'proposal', label: LEAD_STATUSES.proposal, count: n('pricing') },
    { status: 'won', label: 'Won', count: n('won') },
    { status: 'nurture', label: 'Nurture', count: n('nurture') },
    { status: 'not_interested', label: 'Not interested', count: n('lost') },
    { status: 'no_reply', label: 'Closed — no reply', count: n('closed') },
  ];
}

export async function waitingForReply(q = ''): Promise<Lead[]> {
  const conn = await getDb();
  const like = `%${q.slice(0, 80)}%`;
  const res = await conn.execute({
    sql: `SELECT * FROM leads WHERE archived = 0 AND status IN ('waiting_reply', 'nurture')
          AND (? = '' OR name LIKE ? OR city LIKE ? OR phone LIKE ?) ORDER BY last_contacted_at DESC LIMIT 30`,
    args: [q, like, like, like],
  });
  return res.rows as unknown as Lead[];
}

export function whatsappUrl(lead: Pick<Lead, 'whatsapp'>, text: string): string | null {
  const number = (lead.whatsapp || '').replace(/\D/g, '');
  return number.length >= 8 ? `https://web.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(text)}` : null;
}

/** Everyone who has replied, newest reply first, with what they want and the next step. */
export async function repliedLeads(limit = 60): Promise<{ lead: Lead; action: NextAction | null }[]> {
  const conn = await getDb();
  const s = await getSettings();
  const res = await conn.execute({
    sql: `SELECT * FROM leads WHERE archived = 0 AND (last_reply IS NOT NULL OR status IN ('replied','interested','proposal','won'))
          ORDER BY COALESCE(last_reply_at, updated_at) DESC LIMIT ?`,
    args: [limit],
  });
  const leads = res.rows as unknown as Lead[];
  const eng = await engagement(leads.map((l) => l.id));
  return leads.map((lead) => ({ lead, action: nextAction(lead, eng[lead.id], s) }));
}
