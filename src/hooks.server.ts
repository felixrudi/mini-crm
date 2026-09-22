import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { decideAuth } from '$lib/server/auth-policy';
import { verifySessionToken } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname, search } = event.url;

  const secret = process.env.SESSION_SECRET ?? '';
  const token = event.cookies.get('crm_session') ?? '';
  const sessionValid = !!secret && !!token && verifySessionToken(secret, token, Date.now());
  const proxyUser =
    process.env.TRUST_PROXY_USER === '1' && !!event.request.headers.get('remote-user');

  const decision = decideAuth({ pathname, dev, sessionValid, proxyUser });

  if (decision === 'deny') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (decision === 'login') {
    throw redirect(303, `/login?next=${encodeURIComponent(pathname + search)}`);
  }

  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
};
