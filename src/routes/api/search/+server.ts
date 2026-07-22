import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact } from '$lib/server/teable-map';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const LIMIT = 8;

export const GET: RequestHandler = async ({ url }) => {
  const q = (url.searchParams.get('q') || '').trim();
  if (!q) return json({ contacts: [], companies: [] });

  const needle = q.toLowerCase();
  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);

  const firmaNameById = new Map(
    firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string])
  );

  const contacts = kontakteRecs
    .filter((r) => {
      // Globale Suche: Standard ohne Archiv (wie Listen)
      const tags = (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [];
      if (tags.includes('archiv')) return false;
      const firmaId = linkId(r.fields[KONTAKTE_FIELDS.firma]);
      const firmaName = firmaId ? (firmaNameById.get(firmaId) ?? '') : '';
      const hay = [
        r.fields[KONTAKTE_FIELDS.name],
        r.fields[KONTAKTE_FIELDS.email],
        r.fields[KONTAKTE_FIELDS.telefon],
        r.fields[KONTAKTE_FIELDS.telefon2],
        r.fields[KONTAKTE_FIELDS.rolle],
        r.fields[KONTAKTE_FIELDS.whatsapp],
        r.fields[KONTAKTE_FIELDS.wechatId],
        r.fields[KONTAKTE_FIELDS.ort],
        firmaName,
        tags.join(' ')
      ]
        .map((v) => (v ?? '').toString())
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, LIMIT)
    .map((r) =>
      mapContact(r, firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const companies = firmenRecs
    .filter((r) => {
      const tags = (r.fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? [];
      const hay = [
        r.fields[FIRMEN_FIELDS.name],
        r.fields[FIRMEN_FIELDS.website],
        r.fields[FIRMEN_FIELDS.telefon],
        r.fields[FIRMEN_FIELDS.notizen],
        r.fields[FIRMEN_FIELDS.ort],
        r.fields[FIRMEN_FIELDS.strasse],
        r.fields[FIRMEN_FIELDS.plz],
        tags.join(' ')
      ]
        .map((v) => (v ?? '').toString())
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    })
    .slice(0, LIMIT)
    .map((r) => ({
      id: r.id,
      name: r.fields[FIRMEN_FIELDS.name] as string,
      website: (r.fields[FIRMEN_FIELDS.website] as string) ?? null,
      telefon: (r.fields[FIRMEN_FIELDS.telefon] as string) ?? null,
      ort: (r.fields[FIRMEN_FIELDS.ort] as string) ?? null,
      notizen: (r.fields[FIRMEN_FIELDS.notizen] as string) ?? null
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return json({ contacts, companies });
};
