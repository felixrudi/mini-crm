import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact } from '$lib/server/teable-map';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = (url.searchParams.get('q') || '').toLowerCase();
  const tag = url.searchParams.get('tag') || '';
  const kanal = url.searchParams.get('kanal') || '';

  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  let filtered = kontakteRecs.filter((r) => {
    // Standard: Archiv aus Listen/Filter-Ergebnissen
    const tags = (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [];
    return !tags.includes('archiv');
  });
  if (q) {
    filtered = filtered.filter((r) => {
      const hay = `${r.fields[KONTAKTE_FIELDS.name] ?? ''} ${r.fields[KONTAKTE_FIELDS.email] ?? ''} ${r.fields[KONTAKTE_FIELDS.vorname] ?? ''} ${r.fields[KONTAKTE_FIELDS.nachname] ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }
  if (tag) filtered = filtered.filter((r) => ((r.fields[KONTAKTE_FIELDS.tags] as string[]) ?? []).includes(tag));
  if (kanal === 'whatsapp') filtered = filtered.filter((r) => r.fields[KONTAKTE_FIELDS.whatsapp]);
  if (kanal === 'wechat') filtered = filtered.filter((r) => r.fields[KONTAKTE_FIELDS.wechatId]);
  if (!q && !tag && !kanal) filtered = [];

  const limit = q ? 50 : 100;
  const contacts = filtered
    .slice(0, limit)
    .map((r) => mapContact(r, firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null))
    .sort((a, b) => a.name.localeCompare(b.name));

  return json({ contacts });
};
