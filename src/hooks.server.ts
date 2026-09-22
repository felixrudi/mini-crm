import { dev } from '$app/environment';
import type { Handle } from '@sveltejs/kit';
import { decideAuth } from '$lib/server/auth-policy';
import { verifySessionToken } from '$lib/server/session';

function applySecurityHeaders(response: Response): Response {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  return response;
}

/**
 * Baut das Redirect-Ziel für "next" nach dem Login. Bei einer abgelaufenen
 * Sitzung mitten in der Navigation fragt SvelteKit intern oft
 * "/pfad/__data.json" (statt "/pfad") ab — ungefiltert würde "next" nach dem
 * Login auf diese rohe JSON-Antwort zeigen statt auf die echte Seite.
 */
function buildNext(pathname: string, search: string): string {
  const cleanPathname = pathname.replace(/\/__data\.json$/, '');
  const params = new URLSearchParams(search);
  params.delete('x-sveltekit-invalidated');
  const cleanSearch = params.toString();
  return cleanSearch ? `${cleanPathname}?${cleanSearch}` : cleanPathname;
}

export const handle: Handle = async ({ event, resolve }) => {
  const { pathname, search } = event.url;

  const secret = process.env.SESSION_SECRET ?? '';
  const token = event.cookies.get('crm_session') ?? '';
  const sessionValid = !!secret && !!token && verifySessionToken(secret, token, Date.now());
  const proxyUser =
    process.env.TRUST_PROXY_USER === '1' && !!event.request.headers.get('remote-user');

  const decision = decideAuth({ pathname, dev, sessionValid, proxyUser });

  if (decision === 'deny') {
    return applySecurityHeaders(
      new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      })
    );
  }
  if (decision === 'login') {
    // Als Response statt throw redirect() gebaut, damit die Security-Header
    // auch hier noch gesetzt werden können.
    return applySecurityHeaders(
      new Response(null, {
        status: 303,
        headers: { location: `/login?next=${encodeURIComponent(buildNext(pathname, search))}` }
      })
    );
  }

  const response = await resolve(event);
  return applySecurityHeaders(response);
};
