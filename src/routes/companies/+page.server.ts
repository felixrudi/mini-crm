import { sql } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const companies = await sql`
    SELECT c.*, COUNT(co.id)::int as contact_count
    FROM companies c
    LEFT JOIN contacts co ON co.company_id = c.id
    GROUP BY c.id
    ORDER BY c.name`;
  return { companies };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const data = await request.formData();
    const name = data.get('name') as string;
    if (!name?.trim()) return fail(400, { error: 'Name erforderlich' });
    await sql`INSERT INTO companies (name, website, notizen) VALUES (${name.trim()}, ${data.get('website') || null}, ${data.get('notizen') || null})`;
    return { success: true };
  },
  update: async ({ request }) => {
    const data = await request.formData();
    const id = data.get('id') as string;
    await sql`UPDATE companies SET name=${data.get('name')}, website=${data.get('website') || null}, notizen=${data.get('notizen') || null} WHERE id=${id}`;
    return { success: true };
  },
  delete: async ({ request }) => {
    const data = await request.formData();
    await sql`DELETE FROM companies WHERE id=${data.get('id')}`;
    return { success: true };
  }
};
