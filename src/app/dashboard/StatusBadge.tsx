import { LEAD_STATUSES, type LeadStatus } from '@/lib/leads-db';

const TONES: Partial<Record<LeadStatus, string>> = {
  new: 'bg-slate-100 text-slate-700',
  queued: 'bg-amber-100 text-amber-800',
  waiting_reply: 'bg-blue-100 text-blue-800',
  replied: 'bg-violet-100 text-violet-800',
  interested: 'bg-green-100 text-green-800',
  proposal: 'bg-teal-100 text-teal-800',
  won: 'bg-green-600 text-white',
  nurture: 'bg-slate-200 text-slate-600',
  no_reply: 'bg-slate-100 text-slate-500',
  not_interested: 'bg-red-100 text-red-700',
  no_whatsapp: 'bg-slate-100 text-slate-400',
  skipped: 'bg-slate-100 text-slate-400',
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[status] || TONES.new}`}>
      {LEAD_STATUSES[status] || status}
    </span>
  );
}
