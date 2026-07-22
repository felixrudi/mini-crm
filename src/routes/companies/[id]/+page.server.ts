import {
  getRecord,
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  linkId
} from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import { mapCompany, mapContact, mapTimelineEntry } from '$lib/server/teable-map';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const company = await getRecord(TABLES.firmen, params.id);
  if (!company) throw error(404, 'Firma nicht gefunden');

  const [allContacts, allInteractions] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.interaktionenReal)
  ]);

  const contacts = allContacts
    .filter((c) => linkId(c.fields[KONTAKTE_FIELDS.firma]) === params.id)
    .map((c) => mapContact(c))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  // Firmen-eigene Interaktionen (Link-Feld Firma) — unabhängig von Kontakten,
  // damit Service-Anrufe ohne Dummy-Kontakt vermerkt werden können.
  const timeline = allInteractions
    .filter((r) => linkId(r.fields[INTERAKTIONEN_FIELDS.firma]) === params.id)
    .map(mapTimelineEntry)
    .sort((a, b) => b.datum.localeCompare(a.datum));

  return {
    company: mapCompany(company),
    contacts,
    timeline
  };
};

export const actions: Actions = {
  update: async ({ request, params }) => {
    const d = await request.formData();
    await updateRecord(TABLES.firmen, params.id, {
      [FIRMEN_FIELDS.name]: d.get('name'),
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.telefon]: d.get('telefon') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  add_interaction: async ({ request, params }) => {
    const d = await request.formData();
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.firma]: [{ id: params.id }],
      [INTERAKTIONEN_FIELDS.typ]: d.get('typ'),
      [INTERAKTIONEN_FIELDS.datum]: d.get('datum') || new Date().toISOString(),
      [INTERAKTIONEN_FIELDS.titel]: d.get('zusammenfassung') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('text') || null
    });
    return { success: true };
  },
  add_email: async ({ request, params }) => {
    const d = await request.formData();
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.firma]: [{ id: params.id }],
      [INTERAKTIONEN_FIELDS.typ]: d.get('richtung') === 'rein' ? 'email_rein' : 'email_raus',
      [INTERAKTIONEN_FIELDS.von]: d.get('von') || null,
      [INTERAKTIONEN_FIELDS.an]: d.get('an') || null,
      [INTERAKTIONEN_FIELDS.titel]: d.get('betreff') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('body_text') || null,
      [INTERAKTIONEN_FIELDS.datum]: d.get('datum') || new Date().toISOString()
    });
    return { success: true };
  },
  delete_interaction: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.interaktionenReal, d.get('id') as string);
    return { success: true };
  },
  update_interaction: async ({ request }) => {
    const d = await request.formData();
    await updateRecord(TABLES.interaktionenReal, d.get('id') as string, {
      [INTERAKTIONEN_FIELDS.titel]: d.get('zusammenfassung') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('text') || null
    });
    return { success: true };
  },
  delete_email: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.interaktionenReal, d.get('id') as string);
    return { success: true };
  },
  update_email: async ({ request }) => {
    const d = await request.formData();
    await updateRecord(TABLES.interaktionenReal, d.get('id') as string, {
      [INTERAKTIONEN_FIELDS.titel]: d.get('betreff') || null,
      [INTERAKTIONEN_FIELDS.text]: d.get('body_text') || null
    });
    return { success: true };
  }
};
