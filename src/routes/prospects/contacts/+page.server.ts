import { sql } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Shows contacts that have the "prospect" tag (imported outreach contacts)
// and allows converting them to real contacts by removing the tag.

const PROSPECT_TAG = 'prospect';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';

  let contacts;
  if (q) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE ${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))
        AND (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'})
      ORDER BY c.name`;
  } else {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE ${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))
      ORDER BY c.name`;
  }

  const total = await sql`SELECT COUNT(*)::int as n FROM contacts WHERE ${PROSPECT_TAG} = ANY(COALESCE(tags, '{}'::text[]))`;

  return { contacts, total: total[0]?.n ?? 0, q };
};

export const actions: Actions = {
  // Remove "prospect" tag → contact moves to regular /contacts view
  convert: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    if (!id) return fail(400, { error: 'ID fehlt' });

    const [existing] = await sql`SELECT id, tags FROM contacts WHERE id = ${id}`;
    if (!existing) return fail(404, { error: 'Kontakt nicht gefunden' });

    const newTags = ((existing.tags as string[]) ?? []).filter((t: string) => t !== PROSPECT_TAG);
    await sql`UPDATE contacts SET tags = ${newTags} WHERE id = ${id}`;
    return { success: true };
  },

  // Delete the contact entirely
  delete: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    if (!id) return fail(400, { error: 'ID fehlt' });
    await sql`DELETE FROM contacts WHERE id = ${id}`;
    return { success: true };
  }
};
