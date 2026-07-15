import { getRecord, listRecords, updateRecord, linkId } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { mapCompany, mapContact } from '$lib/server/teable-map';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const company = await getRecord(TABLES.firmen, params.id);
  if (!company) throw error(404, 'Firma nicht gefunden');

  const allContacts = await listRecords(TABLES.kontakteReal);
  const contacts = allContacts
    .filter((c) => linkId(c.fields[KONTAKTE_FIELDS.firma]) === params.id)
    .map((c) => mapContact(c))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return {
    company: mapCompany(company),
    contacts
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
  }
};
