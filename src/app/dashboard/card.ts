// Builds the props for <MessageCard> on the server (message texts, designs, engagement).
import type { Lead } from '@/lib/leads-db';
import { defaultDesigns, designLinks, type Engagement, type MessageKind, MESSAGES, messageTemplate, type Settings } from '@/lib/outreach';
import type { CardDesign, CardOption } from './MessageCard';

export function cardFor(lead: Lead, settings: Settings, kinds: MessageKind[], eng?: Record<string, Engagement>) {
  const options: CardOption[] = [...new Set(kinds)].map((kind) => ({
    kind, label: MESSAGES[kind].label, template: messageTemplate(kind, lead, settings), designs: defaultDesigns(lead, kind),
  }));
  const designs: CardDesign[] = designLinks(lead).map((d) => ({
    id: d.id, name: d.name, style: d.style, url: d.url, previewUrl: d.previewUrl, sent: d.sent,
    views: eng?.[d.id]?.views, seconds: eng?.[d.id]?.seconds, clicks: eng?.[d.id]?.clicks,
  }));
  return { options, designs };
}

/** Message types offered on a lead page: the recommended one first, then the useful others. */
export const ALL_KINDS: MessageKind[] = ['followup_1', 'followup_2', 'followup_final', 'more_designs', 'pricing', 'call', 'changes',
  'portfolio', 'timeline', 'follow_up', 'not_now', 'onboarding', 'not_interested'];
