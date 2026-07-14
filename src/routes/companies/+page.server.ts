import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const [firmenRecs, kontakteRecs] = await Promise.all([
    listRecords(TABLES.firmen),
    listRecords(TABLES.kontakteReal)
  ]);

  // Mirror the original SQL: hide companies whose only linked contacts are
  // prospect-only (not applicable any more — prospects are a separate table
  // now, so every company with >=1 real contact, or 0 contacts, is shown).
  const contactCountByCompany = new Map<string, number>();
  for (const k of kontakteRecs) {
    const companyId = linkId(k.fields[KONTAKTE_FIELDS.firma]);
    if (companyId) contactCountByCompany.set(companyId, (contactCountByCompany.get(companyId) ?? 0) + 1);
  }

  const companies = firmenRecs
    .map((r) => ({
      id: r.id,
      name: r.fields[FIRMEN_FIELDS.name] as string,
      website: (r.fields[FIRMEN_FIELDS.website] as string) ?? null,
      strasse: (r.fields[FIRMEN_FIELDS.strasse] as string) ?? null,
      plz: (r.fields[FIRMEN_FIELDS.plz] as string) ?? null,
      ort: (r.fields[FIRMEN_FIELDS.ort] as string) ?? null,
      land: (r.fields[FIRMEN_FIELDS.land] as string) ?? null,
      notizen: (r.fields[FIRMEN_FIELDS.notizen] as string) ?? null,
      contact_count: contactCountByCompany.get(r.id) ?? 0
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { companies };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim();
    if (!name) return fail(400, { error: 'Name erforderlich' });
    await createRecord(TABLES.firmen, {
      [FIRMEN_FIELDS.name]: name,
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await updateRecord(TABLES.firmen, id, {
      [FIRMEN_FIELDS.name]: d.get('name'),
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.firmen, d.get('id') as string);
    return { success: true };
  }
};
