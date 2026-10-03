'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkPassword, endSession, requireLogin, startSession } from '@/lib/dashboard-auth';
import { addNote, LEAD_STATUSES, type LeadStatus, setArchived, setStatus } from '@/lib/leads-db';
import { scheduleBackup } from '@/lib/sheet-backup';

export async function login(_prev: { error: string } | null, form: FormData): Promise<{ error: string } | null> {
  const password = String(form.get('password') || '');
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 1000)); // slow down guessing
    return { error: 'Wrong password.' };
  }
  await startSession();
  redirect('/dashboard/actions');
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/dashboard/login');
}

function leadId(form: FormData): string {
  const id = String(form.get('id') || '');
  if (!id || id.length > 200) throw new Error('Bad lead id');
  return id;
}

export async function changeStatus(form: FormData): Promise<void> {
  await requireLogin();
  const id = leadId(form);
  const status = String(form.get('status') || '') as LeadStatus;
  if (!(status in LEAD_STATUSES)) throw new Error('Unknown status');
  await setStatus(id, status);
  scheduleBackup();
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/leads/${encodeURIComponent(id)}`);
}

export async function saveNote(form: FormData): Promise<void> {
  await requireLogin();
  const id = leadId(form);
  await addNote(id, String(form.get('note') || ''));
  scheduleBackup();
  revalidatePath(`/dashboard/leads/${encodeURIComponent(id)}`);
}

export async function archive(form: FormData): Promise<void> {
  await requireLogin();
  const id = leadId(form);
  await setArchived(id, form.get('archived') === '1');
  scheduleBackup();
  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/leads/${encodeURIComponent(id)}`);
}

// ------------------------------------------------------------------ WhatsApp outreach

function refresh(id?: string) {
  revalidatePath('/dashboard', 'layout');
  if (id) revalidatePath(`/dashboard/leads/${encodeURIComponent(id)}`);
}

/** "✓ Sent": one action records the message, designs, stage, follow-up count and next date. */
export async function sendMessage(form: FormData): Promise<void> {
  await requireLogin();
  const { MESSAGES, recordSent } = await import('@/lib/outreach');
  const id = leadId(form);
  const text = String(form.get('text') || '').trim();
  if (!text) throw new Error('Empty message');
  const kind = String(form.get('kind') || 'first') as keyof typeof MESSAGES;
  if (!(kind in MESSAGES)) throw new Error('Unknown message');
  const demos = String(form.get('demos') || '').split(',').map((d) => d.trim()).filter(Boolean).slice(0, 20);
  await recordSent(id, text, kind, demos);
  scheduleBackup();
  refresh(id);
  const back = String(form.get('back') || '');
  if (back.startsWith('/dashboard')) redirect(back);
}

export async function skipLead(form: FormData): Promise<void> {
  await requireLogin();
  await setStatus(leadId(form), 'skipped');
  scheduleBackup();
  refresh();
}

export async function saveReply(form: FormData): Promise<void> {
  await requireLogin();
  const { recordReply } = await import('@/lib/outreach');
  const id = leadId(form);
  const text = String(form.get('reply') || '').trim();
  if (!text) return;
  await recordReply(id, text, String(form.get('intent') || '') || undefined);
  scheduleBackup();
  refresh(id);
  const back = String(form.get('back') || '');
  if (back.startsWith('/dashboard')) redirect(back);
}

export async function changeIntent(form: FormData): Promise<void> {
  await requireLogin();
  const { setIntent } = await import('@/lib/outreach');
  const id = leadId(form);
  await setIntent(id, String(form.get('intent') || ''));
  scheduleBackup();
  refresh(id);
}

export async function scheduleLater(form: FormData): Promise<void> {
  await requireLogin();
  const { scheduleFollowUp } = await import('@/lib/outreach');
  const id = leadId(form);
  const days = Math.min(90, Math.max(0, parseInt(String(form.get('days') || '3'), 10) || 3));
  await scheduleFollowUp(id, days);
  scheduleBackup();
  refresh(id);
}

export async function nurture(form: FormData): Promise<void> {
  await requireLogin();
  const { moveToNurture } = await import('@/lib/outreach');
  const id = leadId(form);
  await moveToNurture(id);
  scheduleBackup();
  refresh(id);
}

export async function saveSettingsAction(form: FormData): Promise<void> {
  await requireLogin();
  const { DEFAULT_SETTINGS, saveSettings } = await import('@/lib/outreach');
  const values: Record<string, string> = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    const v = form.get(key);
    if (typeof v === 'string') values[key] = v.trim() || DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS];
  }
  const clamp = (key: string, min: number, max: number, fallback: number) => {
    const n = parseInt(values[key], 10);
    values[key] = String(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback);
  };
  clamp('dailySend', 1, 200, 50);
  clamp('minScore', 0, 100, 60);
  for (const k of ['fu1Days', 'fu2Days', 'finalDays']) clamp(k, 0, 60, 3);
  clamp('closeAfterDays', 1, 60, 3);
  clamp('dealCheck1Days', 0, 60, 2);
  clamp('dealCheck2Days', 0, 60, 3);
  clamp('nurtureDays', 7, 365, 30);
  values.keepNurture = form.get('keepNurture') === '1' ? '1' : '';
  await saveSettings(values);
  refresh();
  redirect('/dashboard/settings?saved=1');
}

export async function backupNow(form: FormData): Promise<void> {
  await requireLogin();
  const { backupToSheet } = await import('@/lib/sheet-backup');
  const r = await backupToSheet(form.get('full') === '1');
  revalidatePath('/dashboard/settings');
  redirect(`/dashboard/settings?backup=${r.ok ? 'ok' : 'error'}`);
}

export async function resetTexts(): Promise<void> {
  await requireLogin();
  const { resetMessageTexts } = await import('@/lib/outreach');
  await resetMessageTexts();
  refresh();
  redirect('/dashboard/settings?saved=1');
}
