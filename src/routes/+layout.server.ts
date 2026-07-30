import { redirect } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url, request }) => {
  if (url.pathname.startsWith('/login')) return {};

  const remoteUser = request.headers.get('remote-user') || request.headers.get('x-forwarded-user');
  const session = cookies.get('crm_session');

  if (!remoteUser && session !== 'authenticated') {
    throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  }

  return {};
};
