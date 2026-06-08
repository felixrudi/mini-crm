import { sql } from '$lib/db';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const [company] = await sql`SELECT * FROM companies WHERE id = ${params.id}`;
  if (!company) throw error(404, 'Firma nicht gefunden');

  const contacts = await sql`
    SELECT * FROM contacts WHERE company_id = ${params.id} ORDER BY name`;

  return { company, contacts };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const d = await request.formData();
    await sql`UPDATE companies SET
      name=${d.get('name') as string}, website=${d.get('website') || null},
      strasse=${d.get('strasse') || null}, plz=${d.get('plz') || null},
      ort=${d.get('ort') || null}, land=${d.get('land') || null},
      notizen=${d.get('notizen') || null}
      WHERE id=${params.id}`;
    return { success: true };
  }
};
