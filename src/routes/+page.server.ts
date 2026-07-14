import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, AUFGABEN_FIELDS, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import { mapAction, mapContact } from '$lib/server/teable-map';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [aufgabenRecs, kontakteRecs, firmenRecs, interaktionenRecs] = await Promise.all([
    listRecords(TABLES.aufgabenReal),
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen),
    listRecords(TABLES.interaktionenReal)
  ]);

  const kontaktNameById = new Map(kontakteRecs.map((k) => [k.id, k.fields[KONTAKTE_FIELDS.name] as string]));
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  const open_actions = aufgabenRecs
    .filter((a) => a.fields[AUFGABEN_FIELDS.status] === 'offen')
    .map((a) => mapAction(a, kontaktNameById.get(linkId(a.fields[AUFGABEN_FIELDS.kontakt]) ?? '') ?? null))
    .sort((a, b) => {
      if (!a.faellig_am) return 1;
      if (!b.faellig_am) return -1;
      return a.faellig_am.localeCompare(b.faellig_am);
    })
    .slice(0, 10);

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
    companies: firmenRecs.length,
    open_actions: aufgabenRecs.filter((a) => a.fields[AUFGABEN_FIELDS.status] === 'offen').length
  };

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();

  return { open_actions, recent_contacts, stats, allTags };
};
