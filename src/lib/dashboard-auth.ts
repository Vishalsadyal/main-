// Login for the leads dashboard (/dashboard): one password, DASHBOARD_PASSWORD.
// The session is an HTTP-only cookie signed with DASHBOARD_SECRET, valid for 14 days.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const COOKIE = 'w3_dash';
const MAX_AGE = 14 * 24 * 60 * 60; // seconds

function secret(): string | null {
  return process.env.DASHBOARD_SECRET || null;
}

export function isSetUp(): boolean {
  return Boolean(process.env.DASHBOARD_PASSWORD && process.env.DASHBOARD_SECRET);
}

function sign(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('base64url');
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(password: string): boolean {
  const expected = process.env.DASHBOARD_PASSWORD;
  if (!expected || !secret()) return false;
  // Compare HMACs so the comparison takes the same time whatever the length.
  return same(sign(password, secret()!), sign(expected, secret()!));
}

export async function startSession(): Promise<void> {
  const expires = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = `${expires}.${sign(String(expires), secret()!)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isLoggedIn(): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  const value = (await cookies()).get(COOKIE)?.value || '';
  const [expires, mac] = value.split('.');
  if (!expires || !mac || Number(expires) < Date.now() / 1000) return false;
  return same(mac, sign(expires, key));
}

/** Use at the top of every dashboard page, action and route. */
export async function requireLogin(): Promise<void> {
  if (!(await isLoggedIn())) redirect('/dashboard/login');
}
