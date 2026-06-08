import { sql } from '$lib/db';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const [contact] = await sql`
    SELECT c.*, co.name as company_name FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE c.id = ${params.id}`;

  if (!contact) throw error(404, 'Kontakt nicht gefunden');

  const timeline = await sql`
    SELECT * FROM contact_timeline WHERE contact_id = ${params.id}
    ORDER BY datum DESC`;

  const actions_list = await sql`
    SELECT * FROM actions WHERE contact_id = ${params.id} ORDER BY faellig_am NULLS LAST`;

  const companies = await sql`SELECT id, name FROM companies ORDER BY name`;

  return { contact, timeline, actions_list, companies };
};

export const actions: Actions = {
  add_interaction: async ({ request, params }) => {
    const d = await request.formData();
    await sql`INSERT INTO interactions (contact_id, typ, datum, zusammenfassung, text)
      VALUES (${params.id}, ${d.get('typ')}, ${d.get('datum') || 'now()'}, ${d.get('zusammenfassung') || null}, ${d.get('text') || null})`;
    return { success: true };
  },
  add_email: async ({ request, params }) => {
    const d = await request.formData();
    await sql`INSERT INTO emails (contact_id, richtung, von, an, betreff, body_text, datum)
      VALUES (${params.id}, ${d.get('richtung')}, ${d.get('von') || null}, ${d.get('an') || null},
              ${d.get('betreff') || null}, ${d.get('body_text') || null}, ${d.get('datum') || 'now()'})`;
    return { success: true };
  },
  add_action: async ({ request, params }) => {
    const d = await request.formData();
    await sql`INSERT INTO actions (contact_id, titel, faellig_am, notizen)
      VALUES (${params.id}, ${d.get('titel')}, ${d.get('faellig_am') || null}, ${d.get('notizen') || null})`;
    return { success: true };
  },
  toggle_action: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await sql`UPDATE actions SET status = CASE WHEN status='offen' THEN 'erledigt' ELSE 'offen' END WHERE id=${id}`;
    return { success: true };
  },
  update_contact: async ({ request, params }) => {
    const d = await request.formData();
    await sql`UPDATE contacts SET company_id=${d.get('company_id') || null}, name=${d.get('name')},
      email=${d.get('email') || null}, telefon=${d.get('telefon') || null}, whatsapp=${d.get('whatsapp') || null},
      wechat_id=${d.get('wechat_id') || null}, linkedin_url=${d.get('linkedin_url') || null},
      rolle=${d.get('rolle') || null}, notizen=${d.get('notizen') || null} WHERE id=${params.id}`;
    return { success: true };
  }
};
