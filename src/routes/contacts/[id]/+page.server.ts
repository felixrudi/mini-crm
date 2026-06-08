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
  update_action: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await sql`UPDATE actions SET
      titel=${d.get('titel') || null},
      faellig_am=${d.get('faellig_am') || null},
      notizen=${d.get('notizen') || null}
      WHERE id=${id}`;
    return { success: true };
  },
  delete_action: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM actions WHERE id=${d.get('id')}`;
    return { success: true };
  },
  delete_interaction: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM interactions WHERE id=${d.get('id')}`;
    return { success: true };
  },
  update_interaction: async ({ request }) => {
    const d = await request.formData();
    await sql`UPDATE interactions SET
      zusammenfassung=${d.get('zusammenfassung') || null},
      text=${d.get('text') || null}
      WHERE id=${d.get('id')}`;
    return { success: true };
  },
  delete_email: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM emails WHERE id=${d.get('id')}`;
    return { success: true };
  },
  update_email: async ({ request }) => {
    const d = await request.formData();
    await sql`UPDATE emails SET
      betreff=${d.get('betreff') || null},
      body_text=${d.get('body_text') || null}
      WHERE id=${d.get('id')}`;
    return { success: true };
  },
  update_contact: async ({ request, params }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim() || 'Unbekannt';
    const rawTags = (d.get('tags') as string) || '';
    const tags = rawTags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
    await sql`UPDATE contacts SET
      company_id=${d.get('company_id') || null}, name=${name},
      vorname=${d.get('vorname') || null}, nachname=${d.get('nachname') || null},
      titel=${d.get('titel') || null}, anrede=${d.get('anrede') || null},
      strasse=${d.get('strasse') || null}, plz=${d.get('plz') || null}, ort=${d.get('ort') || null},
      geburtstag=${d.get('geburtstag') || null},
      email=${d.get('email') || null}, telefon=${d.get('telefon') || null},
      telefon2=${d.get('telefon2') || null},
      whatsapp=${d.get('whatsapp') || null}, wechat_id=${d.get('wechat_id') || null},
      linkedin_url=${d.get('linkedin_url') || null}, rolle=${d.get('rolle') || null},
      notizen=${d.get('notizen') || null}, iban=${d.get('iban') || null}, tags=${tags}
      WHERE id=${params.id}`;
    return { success: true };
  }
};
