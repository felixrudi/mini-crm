import { sql } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';

  const contacts = q
    ? await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'} ORDER BY c.name`
    : await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id ORDER BY c.name`;

  const companies = await sql`SELECT id, name FROM companies ORDER BY name`;

  return { contacts, companies, q };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = d.get('name') as string;
    if (!name?.trim()) return fail(400, { error: 'Name erforderlich' });
    await sql`INSERT INTO contacts (company_id, name, email, telefon, whatsapp, wechat_id, linkedin_url, rolle, notizen)
      VALUES (${d.get('company_id') || null}, ${name.trim()}, ${d.get('email') || null}, ${d.get('telefon') || null},
              ${d.get('whatsapp') || null}, ${d.get('wechat_id') || null}, ${d.get('linkedin_url') || null},
              ${d.get('rolle') || null}, ${d.get('notizen') || null})`;
    return { success: true };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await sql`UPDATE contacts SET company_id=${d.get('company_id') || null}, name=${d.get('name')},
      email=${d.get('email') || null}, telefon=${d.get('telefon') || null}, whatsapp=${d.get('whatsapp') || null},
      wechat_id=${d.get('wechat_id') || null}, linkedin_url=${d.get('linkedin_url') || null},
      rolle=${d.get('rolle') || null}, notizen=${d.get('notizen') || null} WHERE id=${id}`;
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM contacts WHERE id=${d.get('id')}`;
    return { success: true };
  }
};
