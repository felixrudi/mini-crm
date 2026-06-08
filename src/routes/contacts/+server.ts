import { sql } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') || '';

  if (!q.trim()) {
    return json({ contacts: [] });
  }

  const contacts = await sql`
    SELECT c.id, c.name, c.email, c.rolle, co.name as company_name
    FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}
    ORDER BY c.name
    LIMIT 10`;

  return json({ contacts });
};
