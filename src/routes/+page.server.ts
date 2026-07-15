import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact } from '$lib/server/teable-map';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [kontakteRecs, firmenRecs, interaktionenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen),
    listRecords(TABLES.interaktionenReal)
  ]);

  const kontaktNameById = new Map(kontakteRecs.map((k) => [k.id, k.fields[KONTAKTE_FIELDS.name] as string]));
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  const lastActivityByContact = new Map<string, string>();
  for (const i of interaktionenRecs) {
    const cid = linkId(i.fields[INTERAKTIONEN_FIELDS.kontakt]);
    const datum = i.fields[INTERAKTIONEN_FIELDS.datum] as string;
    if (!cid || !datum) continue;
    const cur = lastActivityByContact.get(cid);
    if (!cur || datum > cur) lastActivityByContact.set(cid, datum);
  }

  const recent_contacts = kontakteRecs
    .map((c) => ({
      ...mapContact(c, firmaNameById.get(linkId(c.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null),
      last_activity: lastActivityByContact.get(c.id) ?? null
    }))
    .sort((a, b) => {
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return b.last_activity.localeCompare(a.last_activity);
    })
    .slice(0, 8);

  const stats = {
    contacts: kontakteRecs.length,
    companies: firmenRecs.length
  };

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();

  return { recent_contacts, stats, allTags };
};
