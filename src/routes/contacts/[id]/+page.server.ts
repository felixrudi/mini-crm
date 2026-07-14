import {
  getRecord,
  listRecords,
  createRecord,
  updateRecord,
  deleteRecord,
  linkId
} from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS, AUFGABEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact, mapTimelineEntry, mapAction } from '$lib/server/teable-map';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id);
  if (!contact) throw error(404, 'Kontakt nicht gefunden');

  const [firma, allInteractions, allActions, firmenRecs] = await Promise.all([
    linkId(contact.fields[KONTAKTE_FIELDS.firma])
      ? getRecord(TABLES.firmen, linkId(contact.fields[KONTAKTE_FIELDS.firma])!)
      : Promise.resolve(null),
    listRecords(TABLES.interaktionenReal),
    listRecords(TABLES.aufgabenReal),
    listRecords(TABLES.firmen)
  ]);

  // Replaces the contact_timeline VIEW: Interaktionen_Real already merges
  // interactions+emails, so this is just a filter+sort, no UNION needed.
  // mapTimelineEntry derives {art, subtyp, titel, inhalt, eintrag_id} from the
  // merged table's Typ field — this is the exact shape TimelineItem.svelte expects.
  const timeline = allInteractions
    .filter((r) => linkId(r.fields[INTERAKTIONEN_FIELDS.kontakt]) === params.id)
    .map(mapTimelineEntry)
    .sort((a, b) => b.datum.localeCompare(a.datum));

  const actions_list = allActions
    .filter((r) => linkId(r.fields[AUFGABEN_FIELDS.kontakt]) === params.id)
    .map((r) => mapAction(r))
    .sort((a, b) => {
      if (!a.faellig_am) return 1;
      if (!b.faellig_am) return -1;
      return a.faellig_am.localeCompare(b.faellig_am);
    });

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return {
    contact: mapContact(contact, (firma?.fields[FIRMEN_FIELDS.name] as string) ?? null),
    timeline,
    actions_list,
    companies
  };
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
  add_action: async ({ request, params }) => {
    const d = await request.formData();
    await createRecord(TABLES.aufgabenReal, {
      [AUFGABEN_FIELDS.kontakt]: [{ id: params.id }],
      [AUFGABEN_FIELDS.titel]: d.get('titel'),
      [AUFGABEN_FIELDS.faelligAm]: d.get('faellig_am') || null,
      [AUFGABEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  toggle_action: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const existing = await getRecord(TABLES.aufgabenReal, id);
    const current = existing?.fields[AUFGABEN_FIELDS.status];
    await updateRecord(TABLES.aufgabenReal, id, {
      [AUFGABEN_FIELDS.status]: current === 'offen' ? 'erledigt' : 'offen'
    });
    return { success: true };
  },
  update_action: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await updateRecord(TABLES.aufgabenReal, id, {
      [AUFGABEN_FIELDS.titel]: d.get('titel') || null,
      [AUFGABEN_FIELDS.faelligAm]: d.get('faellig_am') || null,
      [AUFGABEN_FIELDS.notizen]: d.get('notizen') || null
    });
    return { success: true };
  },
  delete_action: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.aufgabenReal, d.get('id') as string);
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
