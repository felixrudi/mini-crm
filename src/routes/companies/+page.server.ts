import { sql } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Exclude companies that are linked exclusively to prospect-tagged contacts
  // (i.e. companies that have no real contacts yet, only outreach imports).
  // Companies with at least one non-prospect contact (or no contacts at all but
  // created manually) are always shown.
  const companies = await sql`
    SELECT c.*, COUNT(co.id)::int as contact_count
    FROM companies c
    LEFT JOIN contacts co ON co.company_id = c.id
    WHERE NOT EXISTS (
      SELECT 1 FROM contacts pc
      WHERE pc.company_id = c.id
        AND 'prospect' = ANY(COALESCE(pc.tags, '{}'::text[]))
    )
    OR EXISTS (
      SELECT 1 FROM contacts rc
      WHERE rc.company_id = c.id
        AND NOT ('prospect' = ANY(COALESCE(rc.tags, '{}'::text[])))
    )
    GROUP BY c.id
    ORDER BY c.name`;
  return { companies };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = d.get('name') as string;
    if (!name?.trim()) return fail(400, { error: 'Name erforderlich' });
    await sql`INSERT INTO companies (name, website, strasse, plz, ort, land, notizen)
      VALUES (${name.trim()}, ${d.get('website') || null}, ${d.get('strasse') || null},
              ${d.get('plz') || null}, ${d.get('ort') || null}, ${d.get('land') || null},
              ${d.get('notizen') || null})`;
    return { success: true };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await sql`UPDATE companies SET
      name=${d.get('name')}, website=${d.get('website') || null},
      strasse=${d.get('strasse') || null}, plz=${d.get('plz') || null},
      ort=${d.get('ort') || null}, land=${d.get('land') || null},
      notizen=${d.get('notizen') || null}
      WHERE id=${id}`;
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM companies WHERE id=${d.get('id')}`;
    return { success: true };
  }
};
