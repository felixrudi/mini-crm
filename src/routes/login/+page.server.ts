import { fail, redirect } from '@sveltejs/kit';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  if (cookies.get('crm_session') === 'authenticated') {
    throw redirect(303, '/');
  }
  return {};
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const d = await request.formData();
    const password = d.get('password') as string;

    if (password !== process.env.CRM_PASSWORD) {
      return fail(401, { error: 'Falsches Passwort' });
    }

    cookies.set('crm_session', 'authenticated', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    const next = url.searchParams.get('next') || '/';
    throw redirect(303, next);
  }
};
