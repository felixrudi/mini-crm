import { sql } from '$lib/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const actions_open = await sql`
    SELECT a.*, c.name as contact_name FROM actions a
    LEFT JOIN contacts c ON a.contact_id = c.id
    WHERE a.status = 'offen' ORDER BY a.faellig_am NULLS LAST`;

  const contacts = await sql`SELECT id, name FROM contacts ORDER BY name`;

  return { actions_open, contacts };
};

export const actions: Actions = {
  toggle: async ({ request }) => {
    const d = await request.formData();
    await sql`UPDATE actions SET status = CASE WHEN status='offen' THEN 'erledigt' ELSE 'offen' END WHERE id=${d.get('id')}`;
    return { success: true };
  },
  create: async ({ request }) => {
    const d = await request.formData();
    await sql`INSERT INTO actions (contact_id, titel, faellig_am, notizen)
      VALUES (${d.get('contact_id') || null}, ${d.get('titel')}, ${d.get('faellig_am') || null}, ${d.get('notizen') || null})`;
    return { success: true };
  }
};
