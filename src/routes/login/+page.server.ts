import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { safeEqual } from '$lib/server/safe-equal';
import { createSessionToken, verifySessionToken } from '$lib/server/session';
import { safeNext } from '$lib/server/safe-next';
import { createLimiter } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Hinter dem Proxy sehen alle dieselbe Adresse. 10 Versuche je 15 Minuten reichen für Tippfehler
// und bremsen ein Skript.
const limiter = createLimiter(10, 15 * 60 * 1000);

export const load: PageServerLoad = async ({ cookies }) => {
  const secret = process.env.SESSION_SECRET ?? '';
  const token = cookies.get('crm_session') ?? '';
  if (secret && token && verifySessionToken(secret, token, Date.now())) {
    throw redirect(303, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url, getClientAddress }) => {
    const secret = process.env.SESSION_SECRET;
    const expected = process.env.CRM_PASSWORD;
    if (!secret || !expected) return fail(503, { error: 'Anmeldung ist nicht eingerichtet' });

    if (!limiter.allow(getClientAddress(), Date.now())) {
      return fail(429, { error: 'Zu viele Versuche, bitte in 15 Minuten erneut' });
    }

    const password = String((await request.formData()).get('password') ?? '');
    if (!safeEqual(password, expected)) return fail(401, { error: 'Falsches Passwort' });

    cookies.set('crm_session', createSessionToken(secret, Date.now(), TTL_MS), {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: !dev,
      maxAge: TTL_MS / 1000
    });

    throw redirect(303, safeNext(url.searchParams.get('next')));
  }
};
