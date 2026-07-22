import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact } from '$lib/server/teable-map';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  if (!q.trim()) return json({ contacts: [] });
  // Optional: includeArchiv=1 holt auch archivierte; Standard = aktuell ohne Archiv
  const includeArchiv = url.searchParams.get('includeArchiv') === '1';

  const [all, firmenRecs] = await Promise.all([listRecords(TABLES.kontakteReal), listRecords(TABLES.firmen)]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));
  const needle = q.toLowerCase();
  const contacts = all
    .filter((r) => {
      if (!includeArchiv) {
        const tags = (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [];
        if (tags.includes('archiv')) return false;
      }
      const hay = `${r.fields[KONTAKTE_FIELDS.name] ?? ''} ${r.fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, 10)
    .map((r) => mapContact(r, firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null))
    .sort((a, b) => a.name.localeCompare(b.name));

  return json({ contacts });
};
