import { sql } from '$lib/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const open_actions = await sql`
    SELECT a.*, c.name as contact_name FROM actions a
    LEFT JOIN contacts c ON a.contact_id = c.id
    WHERE a.status = 'offen' ORDER BY a.faellig_am NULLS LAST LIMIT 10`;

  const recent_contacts = await sql`
    SELECT co.*, cm.name as company_name,
      (SELECT datum FROM contact_timeline WHERE contact_id = co.id ORDER BY datum DESC LIMIT 1) as last_activity
    FROM contacts co LEFT JOIN companies cm ON co.company_id = cm.id
    ORDER BY last_activity DESC NULLS LAST LIMIT 8`;

  const stats = await sql`
    SELECT
      (SELECT COUNT(*) FROM contacts)::int as contacts,
      (SELECT COUNT(*) FROM companies)::int as companies,
      (SELECT COUNT(*) FROM actions WHERE status='offen')::int as open_actions`;

  const allTagsRaw = await sql`SELECT DISTINCT unnest(tags) as tag FROM contacts ORDER BY tag`;
  const allTags = allTagsRaw.map((r: { tag: string }) => r.tag);

  return { open_actions, recent_contacts, stats: stats[0], allTags };
};
