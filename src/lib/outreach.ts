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
  dailySend: '20',
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
  myCity: 'Punjab',      // {my_city} — where you are, for the meeting messages
  // Your WhatsApp numbers. Each has its own daily limit for first messages; when One is full, use Two.
  sender1Name: 'One',
  sender1Phone: '9805559015',
  sender1Daily: '20',
  sender2Name: 'Two',
  sender2Phone: '7814958809',
  sender2Daily: '20',
  openLine: 'Please feel free to message or call me anytime — happy to talk about anything, even if you just have questions. No pressure at all. 🙂',

  // ---- first contact
  first:
    // The video link comes first: WhatsApp builds its preview card from the first link in a message.
    '🎥 {video_link}\n\n' +
    'Hi {name} 🙏\n\n' +
    'I found your {business_word} on *Google Maps*{in_city} and {pitch}\n\n{competitor_links}' +
    'So I made you a *free website preview* — with your name, and *call & WhatsApp buttons*:\n{design_links}\n\n' +
    '*Shall I set it up for you?* 🙂 No pressure at all.\n— {my_name}',

  // ---- no reply: gentle follow-ups (short — 2–4 lines each)
  followup_1:
    'Hi {name} 🙂 Did you see your *website preview*?\n\n' +
    'A few more styles for you:\n{design_links}\n\n' +
    '*Which one do you like?*',
  followup_2:
    'Hi {name} 🙏\n\n{competitor_links}' +
    '*Shall we get you found on Google too?* Your preview:\n{design_links}',
  followup_final:
    'Hi {name}, my last message 🙏\n\n' +
    'Complete website + Google Maps setup, just *{starter_price}*.\n\n' +
    'Reply *“Yes”* anytime — your design stays ready.',

  // ---- after they reply (short — easy to read on a phone)
  more_designs:
    'Thank you, {name}! 😊\n\n' +
    'Here are your designs:\n{design_links}\n\n' +
    '*Which one do you like?* I\'ll add your photos and services.',
  pricing:
    'Thank you for asking, {name}! 😊\n\n' +
    '*Complete package: {price}* — no hidden costs\n' +
    '✅ Professional website (mobile-friendly)\n' +
    '✅ Domain, hosting & SSL — 1 year\n' +
    '✅ WhatsApp, Call & Maps buttons\n' +
    '✅ Google & Apple Maps setup\n' +
    '✅ 30 days support\n\n' +
    'Ready in *2–3 days*. *Shall we start?* 🙂',
  call:
    'Sure, {name}! *I\'ll call you shortly.* 📞\n\nIf another time is better, just tell me.',
  meeting_video:
    'Thank you, {dear}! 🙏\n\n' +
    'I\'m in {my_city}, so let\'s do a quick *video call* (15 min) — I\'ll show you your designs and the package.\n\n' +
    '*What time suits you?* 🙂',
  meeting_confirm:
    'Confirmed, {dear}! 🙏 Our call is on *{meeting_time}*.\n\n' +
    '👉 Join here: {meeting_link}\n\n' +
    'Just tap the link at that time — no sign-up needed.',
  meeting_reminder:
    'Hi {dear} 🙏 Reminder — our call is at *{meeting_time}*.\n\n' +
    '👉 {meeting_link}\n\nSee you soon! 🙂',
  meeting_missed:
    'Hi {dear} 🙏 We missed you on the call — no worries!\n\n' +
    'Here are your designs:\n{design_links}\n\n' +
    '*Choose one* and we\'ll make your full website. Or tell me a better time to call.',
  correction_thanks:
    'Thank you for correcting me, {dear}! 🙏 I\'ve updated it — your design will show the right details.',
  meeting_visit:
    'Thank you, {dear}! 🙏 Happy to meet you.\n\n' +
    '*What day and time suit you?* Please share your location and I\'ll be there.',
  changes:
    'Of course, {name}! 😊 *Tell me what to change* — colours, photos, services, anything.\n\n' +
    'Your designs:\n{design_links}',
  introduction:
    'Thank you, {dear} 🙏\n\n' +
    'We are *{my_name}* from {my_city} — we make websites for clinics and local businesses and get them found on Google.\n\n' +
    '🎥 *45-sec video:* {video_link}\n' +
    'Your preview:\n{design_links}\n\n' +
    '*Shall I set it up for you?* 🙂',
  portfolio:
    'Sure, {name}! Designs for businesses like yours:\n{design_links}\n\n' +
    'More of our work: https://www.w3tech.co.in',
  timeline:
    'Hi {name}! First version in *2–3 days*, fully live in about *a week*. 🚀\n\n' +
    'We handle everything technical.',
  follow_up:
    'Hi {name} 🙂 Any questions?\n\n' +
    'Pay *50% to start*, the rest only *after you approve*. Ready in *2–3 days*.',
  not_now:
    'No problem, {name} 🙏 I\'ll keep your design ready — *message me anytime*.',
  not_interested:
    'Thank you for letting me know, {name} 🙏 I won\'t message again. Wishing you lots of success!',
  onboarding:
    'Wonderful, {name}! 🎉 Thank you for trusting us.\n\n' +
    '*Please send:*\n' +
    '1️⃣ Logo (if any)\n' +
    '2️⃣ A few photos\n' +
    '3️⃣ Services & timings\n' +
    '4️⃣ Address & phone to show\n\n' +
    'First version ready in *2–3 days*! 🚀',
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
  'keepNurture' | 'dealCheck1Days' | 'dealCheck2Days' | 'nurtureDays' | 'price' | 'starterPrice' | 'myName' | 'openLine' |
  'sender1Name' | 'sender1Phone' | 'sender1Daily' | 'sender2Name' | 'sender2Phone' | 'sender2Daily' | 'myCity'>;

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
  meeting_video: { label: 'Meeting → video call', designs: 0, advance: null },
  meeting_visit: { label: 'Meeting → I\'ll visit', designs: 0, advance: null },
  meeting_confirm: { label: 'Call confirmed (time + link)', designs: 0, advance: null },
  meeting_reminder: { label: 'Call reminder', designs: 0, advance: null },
  meeting_missed: { label: 'They didn\'t join the call', designs: 3, advance: null },
  correction_thanks: { label: 'Thanks for the correction', designs: 0, advance: null },
  changes: { label: 'Changes requested', designs: 3, advance: 'interested' },
  introduction: { label: 'Introduce yourself', designs: 1, advance: null },
  portfolio: { label: 'Send portfolio', designs: 3, advance: 'interested' },
  timeline: { label: 'Send timeline', designs: 0, advance: null },
  follow_up: { label: 'Check in', designs: 0, advance: null },
  not_now: { label: 'Not right now', designs: 0, advance: null },
  not_interested: { label: 'Close politely', designs: 0, advance: 'not_interested' },
  onboarding: { label: 'Onboarding (said yes)', designs: 0, advance: 'won' },
};
const SEQUENCE: MessageKind[] = ['followup_1', 'followup_2', 'followup_final'];
const IN_DEAL = ['replied', 'interested', 'proposal'];

// Doctors, dentists, clinics… are greeted as "Doctor" in the meeting messages.
const MEDICAL_WORDS = /dent|clinic|doctor|hospital|physician|eye|ophthal|child|paediat|pediat|gyn|skin|derma|plastic|physio|diet|nutrition|medical/i;

/** Is the lead where you are? (Your "my city" setting matches their state or city.) */
export function isNearby(lead: Pick<Lead, 'state' | 'city'>, s: Settings): boolean {
  const mine = (s.myCity || '').trim().toLowerCase();
  if (!mine) return false;
  return [lead.state, lead.city].some((v) => (v || '').trim().toLowerCase() === mine || (v || '').toLowerCase().includes(mine));
}

/** "Sunday, 4 October at 5:30 PM" (India time). */
export function meetingTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  return `${day} at ${time}`;
}

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
  meeting: { label: 'Wants a meeting', kind: 'meeting_video', action: 'Reply: offer a video call (or visit if nearby)' },
  changes: { label: 'Wants changes', kind: 'changes', action: 'Send updated designs' },
  who: { label: 'Asked who you are', kind: 'introduction', action: 'Introduce yourself' },
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
  if (has(/introduc|who are you|who is this|who r u|your name|which company|about you|aap kaun|kaun ho|kaun hai|apna parichay|parichay/)) return 'who';
  if (has(/price|cost|charges?|rate|how much|kitna|kitne|budget|fees?|amount|package/)) return 'price';
  if (has(/\bmeet(ing)?\b|\bcome (to|for|and)\b|\bvisit\b|milne|mil (lo|lete|sakte|ke)|aa jao|aaiye|in person/)) return 'meeting';
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
    return `${names} show up first when people search “${c.search || 'for you'}” — and they already have websites.`;
  }
  if (near) return `${shortName(near.name)}, ${near.km} km from you, already has one.`;
  const any = [...c.top, ...c.nearby].filter(hasSite).slice(0, 2);
  if (any.length) return `${any.map((x) => shortName(x.name)).join(' and ')} near you already ${any.length > 1 ? 'have websites' : 'has one'}.`;
  // Nobody nearby has a website yet — that's the hook.
  const trade = (lead.category_label || lead.category || '').trim().toLowerCase() || 'business';
  return `You could be the first ${trade}${lead.city ? ` in ${lead.city}` : ''} with a professional website — so new customers find you before anyone else.`;
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
    return `• *${shortName(x.name).replace(/\*/g, '')}*${[rating, where].filter(Boolean).length ? ` — ${[rating, where].filter(Boolean).join(', ')}` : ''}${link ? `\n  ${link}` : ''}`;
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
    pitch: !lead.website ? "noticed you don't have a website yet." : 'had a look at your website — it could bring you a lot more enquiries.',
    competitor_line: competitorLine(lead),
    // The list with links when we have it; otherwise the one-sentence version (older leads).
    competitor_links: competitorLinks(lead)
      ? `*Businesses near you that customers already find online:*\n${competitorLinks(lead)}\n\n`
      : competitorLine(lead) && `${competitorLine(lead)}\n\n`,
    demo_link: designLinks(lead)[0]?.url || lead.demo_link || SITE,
    price: settings.price || '[your price]',
    dear: MEDICAL_WORDS.test(`${lead.category || ''} ${lead.category_label || ''}`) ? 'Doctor' : name,
    business_word: MEDICAL_WORDS.test(`${lead.category || ''} ${lead.category_label || ''}`) ? 'clinic' : 'business',
    their_city: city || 'your city',
    my_city: settings.myCity || 'Punjab',
    meeting_time: lead.meeting_at ? meetingTime(lead.meeting_at) : '[call time]',
    meeting_link: lead.meeting_link || '[meeting link]',
    starter_price: settings.starterPrice || settings.price || '[price]',
    my_name: settings.myName || 'W3Tech',
    video_link: `${SITE}/intro`,
    open_line: settings.openLine || DEFAULT_SETTINGS.openLine,
  };
  return (settings[kind] || DEFAULT_SETTINGS[kind]).replace(/\{(\w+)\}/g, (m, k) => (k in values ? values[k] : m))
    .replace(/ +\n/g, '\n').trim();
}

export function withDesigns(template: string, lead: Lead, ids: string[]): string {
  const links = designLinks(lead).filter((d) => ids.includes(d.id)).map((d) => `• *${d.name}*: ${d.url}`).join('\n');
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
  meetingCheck?: boolean; // the call time has passed: did it happen?
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

  // A scheduled call comes first: remind them before, ask how it went after.
  if (lead.meeting_at) {
    const at = Date.parse(lead.meeting_at);
    if (now >= at + 15 * 60_000) {
      return { title: 'How did the call go?', urgent: true, kind: 'meeting_missed', meetingCheck: true,
               situation: `Call was at ${meetingTime(lead.meeting_at)} — mark it done, or send “they didn't join”` };
    }
    if (now >= at - 2 * 3600_000 && !lead.meeting_reminded) {
      return { title: 'Send call reminder', urgent: true, kind: 'meeting_reminder',
               situation: `Call at ${meetingTime(lead.meeting_at)}${lead.meeting_link ? '' : ' · add the meeting link first'}` };
    }
    return null; // call is booked: nothing to chase until then
  }

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
        // A meeting nearby (their state or city is where you are): offer to visit instead of a video call.
        const visit = lead.intent === 'meeting' && isNearby(lead, s);
        return { title: visit ? 'Reply: confirm the meeting (nearby — you can visit)' : intent.action,
                 situation: `${intent.label}: “${(lead.last_reply || '').slice(0, 80)}”`, kind: visit ? 'meeting_visit' : intent.kind,
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
         OR (meeting_at IS NOT NULL AND meeting_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+2 hours'))
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

export type Sender = { id: string; name: string; phone: string; daily: number; sent: number; left: number };

/** Your WhatsApp numbers with today's first messages sent and what's left of each daily limit. */
export async function senders(settings?: Settings): Promise<Sender[]> {
  const s = settings || (await getSettings());
  const conn = await getDb();
  const rows = await conn.execute({
    sql: `SELECT COALESCE(sender, 'one') sender, COUNT(*) n FROM lead_messages WHERE dir = 'out' AND kind = 'first' AND at >= ?
          GROUP BY COALESCE(sender, 'one')`,
    args: [istDayStart()],
  });
  const sent: Record<string, number> = {};
  for (const r of rows.rows) sent[String(r.sender)] = Number(r.n);
  return [
    { id: 'one', name: s.sender1Name || 'One', phone: s.sender1Phone, daily: days(s.sender1Daily, 20) },
    { id: 'two', name: s.sender2Name || 'Two', phone: s.sender2Phone, daily: days(s.sender2Daily, 20) },
  ].filter((x) => (x.phone || '').replace(/\D/g, '').length >= 8)
    .map((x) => ({ ...x, sent: sent[x.id] || 0, left: Math.max(0, x.daily - (sent[x.id] || 0)) }));
}

export const senderLabel = (list: Sender[], id: string | null | undefined) => {
  const x = list.find((y) => y.id === (id || 'one'));
  return x ? `${x.name} (${x.phone})` : id || '';
};

/** The number to use: the lead's own number for follow-ups; for a new lead, the first with room left today. */
export function pickSender(list: Sender[], lead: Pick<Lead, 'sender'>): string {
  if (lead.sender && list.some((x) => x.id === lead.sender)) return lead.sender;
  return (list.find((x) => x.left > 0) || list[0])?.id || 'one';
}

export async function sentToday(): Promise<number> {
  return (await senders()).reduce((n, x) => n + x.sent, 0);
}

export async function todayList(): Promise<{ leads: Lead[]; sent: number; limit: number; available: number; senders: Sender[] }> {
  const s = await getSettings();
  const conn = await getDb();
  const list = await senders(s);
  const limit = list.reduce((n, x) => n + x.daily, 0);
  const sent = list.reduce((n, x) => n + x.sent, 0);
  const room = list.reduce((n, x) => n + x.left, 0);
  const where = `archived = 0 AND status = 'new' AND whatsapp IS NOT NULL AND whatsapp <> '' AND COALESCE(score, 0) >= ?`;
  const minScore = parseInt(s.minScore, 10) || 0;
  const available = Number((await conn.execute({ sql: `SELECT COUNT(*) n FROM leads WHERE ${where}`, args: [minScore] })).rows[0].n);
  const res = await conn.execute({
    sql: `SELECT * FROM leads WHERE ${where} ORDER BY score DESC, COALESCE(review_count, 0) DESC, created_at ASC LIMIT ?`,
    args: [minScore, room],
  });
  return { leads: res.rows as unknown as Lead[], sent, limit, available, senders: list };
}

// ------------------------------------------------------------------ recording what happened

export type Message = { id: number; lead_id: string; at: string; dir: 'in' | 'out'; kind: string | null; text: string; demos: string | null;
  sender: string | null };

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
export async function recordSent(id: string, text: string, kind: MessageKind, demos: string[], senderId?: string): Promise<void> {
  const conn = await getDb();
  const cur = await conn.execute({ sql: 'SELECT status, follow_up_count, demos_sent FROM leads WHERE id = ?', args: [id] });
  if (!cur.rows.length) throw new Error('Lead not found');
  const row = cur.rows[0];
  const s = await getSettings();
  const list = await senders(s);
  const sender = list.find((x) => x.id === senderId) || list[0];
  if (!sender) throw new Error('Add your WhatsApp numbers in Settings first.');
  if (kind === 'first' && sender.left <= 0) {
    throw new Error(`${sender.name} (${sender.phone}) has reached today's limit of ${sender.daily} — send from another number.`);
  }
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
    sql: "INSERT INTO lead_messages (lead_id, dir, kind, text, demos, sender) VALUES (?, 'out', ?, ?, ?, ?)",
    args: [id, kind, text.slice(0, 5000), demos.length ? JSON.stringify(demos) : null, sender.id],
  });
  await conn.execute({
    sql: `UPDATE leads SET status = ?, last_message = ?, sent_at = COALESCE(sent_at, ?), last_contacted_at = ?, follow_up_count = ?,
          next_action_at = ?, closing = ?, demos_sent = ?, sender = COALESCE(sender, ?), updated_at = ?,
          meeting_reminded = CASE WHEN ? = 'meeting_reminder' THEN 1 ELSE meeting_reminded END,
          meeting_at = CASE WHEN ? = 'meeting_missed' THEN NULL ELSE meeting_at END WHERE id = ?`,
    args: [finalStatus, text.slice(0, 3000), now.toISOString(), now.toISOString(), followUps, nextAt, closing, JSON.stringify(allDemos),
           sender.id, now.toISOString(), kind, kind, id],
  });
  await conn.execute({
    sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'message', ?, 'dashboard')",
    args: [id, `${MESSAGES[kind]?.label || kind} · from ${sender.name} (${sender.phone})${demos.length ? ` · designs: ${demos.map((d) => getDesign(d)?.name || d).join(', ')}` : ''}`],
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

/** Book a call: date/time (India time, from the form) and the link. */
export async function setMeeting(id: string, localDateTime: string, link: string): Promise<void> {
  const m = localDateTime.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) throw new Error('Pick a date and time');
  const at = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+05:30`).toISOString();
  const cleanLink = /^https?:\/\/\S+$/.test(link.trim()) ? link.trim().slice(0, 300) : null;
  const conn = await getDb();
  await conn.execute({
    sql: `UPDATE leads SET meeting_at = ?, meeting_link = ?, meeting_reminded = 0, closing = 0, next_action_at = ?, updated_at = ? WHERE id = ?`,
    args: [at, cleanLink, at, new Date().toISOString(), id],
  });
  await conn.execute({
    sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'meeting', ?, 'dashboard')",
    args: [id, `Call booked for ${meetingTime(at)}${cleanLink ? ` · ${cleanLink}` : ''}`],
  });
}

/** The call happened: clear it and come back to the lead tomorrow (send the next step from the lead page). */
export async function meetingDone(id: string, note: string): Promise<void> {
  const conn = await getDb();
  const now = new Date();
  await conn.execute({
    sql: `UPDATE leads SET meeting_at = NULL, meeting_reminded = 0, intent = 'interested', status = CASE WHEN status IN ('new','waiting_reply','replied','no_reply','nurture') THEN 'interested' ELSE status END,
          last_reply_at = NULL, next_action_at = ?, updated_at = ? WHERE id = ?`,
    args: [new Date(now.getTime() + DAY).toISOString(), now.toISOString(), id],
  });
  await conn.execute({
    sql: "INSERT INTO lead_history (lead_id, action, detail, source) VALUES (?, 'meeting', ?, 'dashboard')",
    args: [id, `Call done${note ? ` — ${note.slice(0, 300)}` : ''}`],
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

/** Today's list in order: the first leads go to the first number until its daily limit is used up,
 *  then to the next one — so the switch to number Two happens by itself. */
export function assignSenders(list: Sender[], count: number): { id: string; switched: boolean }[] {
  const left = list.map((x) => x.left);
  const out: { id: string; switched: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const at = left.findIndex((n) => n > 0);
    if (at < 0) break;
    left[at]--;
    out.push({ id: list[at].id, switched: at > 0 });
  }
  return out;
}
