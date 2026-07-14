import { listRecords, createRecord, updateRecord, getRecord, linkId } from '$lib/server/teable';
import { TABLES, AUFGABEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { mapAction } from '$lib/server/teable-map';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [aufgabenRecs, kontakteRecs] = await Promise.all([
    listRecords(TABLES.aufgabenReal),
    listRecords(TABLES.kontakteReal)
  ]);
  const kontaktNameById = new Map(kontakteRecs.map((k) => [k.id, k.fields[KONTAKTE_FIELDS.name] as string]));

  const actions_open = aufgabenRecs
    .filter((a) => a.fields[AUFGABEN_FIELDS.status] === 'offen')
    .map((a) => mapAction(a, kontaktNameById.get(linkId(a.fields[AUFGABEN_FIELDS.kontakt]) ?? '') ?? null))
    .sort((a, b) => {
      if (!a.faellig_am) return 1;
      if (!b.faellig_am) return -1;
      return a.faellig_am.localeCompare(b.faellig_am);
    });

  const contacts = kontakteRecs
    .map((k) => ({ id: k.id, name: k.fields[KONTAKTE_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return { actions_open, contacts };
};

export const actions: Actions = {
  toggle: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const existing = await getRecord(TABLES.aufgabenReal, id);
    const current = existing?.fields[AUFGABEN_FIELDS.status];
    await updateRecord(TABLES.aufgabenReal, id, {
      [AUFGABEN_FIELDS.status]: current === 'offen' ? 'erledigt' : 'offen'
    });
    return { success: true };
  },
  create: async ({ request }) => {
    const d = await request.formData();
    await createRecord(TABLES.aufgabenReal, {
      [AUFGABEN_FIELDS.kontakt]: d.get('contact_id') ? [{ id: d.get('contact_id') as string }] : null,
      [AUFGABEN_FIELDS.titel]: d.get('titel'),
      [AUFGABEN_FIELDS.status]: 'offen',
      [AUFGABEN_FIELDS.faelligAm]: d.get('faellig_am') || null,
      [AUFGABEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  }
};
