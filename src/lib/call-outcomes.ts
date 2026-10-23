// What can happen on a call (shared by the server and the dashboard buttons).
export const MAX_TRIES = 3;

export const CALL_OUTCOMES = {
  yes: { label: '✅ Send the sample', tone: 'good', hint: 'They said “haan, bhej do” — opens the lead to send it on WhatsApp' },
  meeting: { label: '📅 Wants a Google Meet', tone: 'good', hint: 'Book the time on the lead page' },
  later: { label: '🕑 Call back later', tone: 'neutral', hint: 'Picked up but busy — comes back on the chosen day' },
  no_answer: { label: '📵 No answer', tone: 'retry', hint: `Tries again tomorrow · dropped after ${MAX_TRIES}` },
  busy: { label: '🔕 Busy / cut the call', tone: 'retry', hint: `Counts as a try · dropped after ${MAX_TRIES}` },
  has_site: { label: '🌐 Already has a website', tone: 'stop', hint: 'Removed from calls' },
  not_interested: { label: '🙅 Not interested', tone: 'stop', hint: 'Closed — never called or messaged again' },
  wrong: { label: '❌ Wrong number', tone: 'stop', hint: 'Removed from calls' },
} as const;
export type CallOutcome = keyof typeof CALL_OUTCOMES;
