import {
  createRecord,
  updateRecord,
  deleteRecord
} from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import { loadContactDetail } from '$lib/server/detail-loaders';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const data = await loadContactDetail(params.id);
  if (!data) throw error(404, 'Kontakt nicht gefunden');
  return data;
};

export const actions: Actions = {
  add_interaction: async ({ request, params }) => {
    const d = await request.formData();
    await createRecord(TABLES.interaktionenReal, {
      [INTERAKTIONEN_FIELDS.kontakt]: [{ id: params.id }],
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
      [INTERAKTIONEN_FIELDS.kontakt]: [{ id: params.id }],
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
  },
  update_contact: async ({ request, params }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim() || 'Unbekannt';
    const rawTags = (d.get('tags') as string) || '';
    const tags = rawTags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    await updateRecord(TABLES.kontakteReal, params.id, {
      [KONTAKTE_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
      [KONTAKTE_FIELDS.name]: name,
      [KONTAKTE_FIELDS.vorname]: d.get('vorname') || null,
      [KONTAKTE_FIELDS.nachname]: d.get('nachname') || null,
      [KONTAKTE_FIELDS.titel]: d.get('titel') || null,
      [KONTAKTE_FIELDS.anrede]: d.get('anrede') || null,
      [KONTAKTE_FIELDS.strasse]: d.get('strasse') || null,
      [KONTAKTE_FIELDS.plz]: d.get('plz') || null,
      [KONTAKTE_FIELDS.ort]: d.get('ort') || null,
      [KONTAKTE_FIELDS.geburtstag]: d.get('geburtstag') || null,
      [KONTAKTE_FIELDS.email]: d.get('email') || null,
      [KONTAKTE_FIELDS.telefon]: d.get('telefon') || null,
      [KONTAKTE_FIELDS.telefon2]: d.get('telefon2') || null,
      [KONTAKTE_FIELDS.whatsapp]: d.get('whatsapp') || null,
      [KONTAKTE_FIELDS.wechatId]: d.get('wechat_id') || null,
      [KONTAKTE_FIELDS.linkedinUrl]: d.get('linkedin_url') || null,
      [KONTAKTE_FIELDS.rolle]: d.get('rolle') || null,
      [KONTAKTE_FIELDS.notizen]: d.get('notizen') || null,
      [KONTAKTE_FIELDS.iban]: d.get('iban') || null,
      [KONTAKTE_FIELDS.tags]: tags
    });
    return { success: true };
  }
};
