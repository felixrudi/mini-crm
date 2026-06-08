import { redirect } from '@sveltejs/kit';
import { CRM_PASSWORD } from '$env/static/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  if (url.pathname.startsWith('/login')) return {};

  const session = cookies.get('crm_session');
  if (session !== 'authenticated') {
    throw redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
  }

  return {};
};
