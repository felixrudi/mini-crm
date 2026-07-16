import { listRecords, createRecord, updateRecord, deleteRecord, getRecord, linkId } from '$lib/server/teable';
import { TABLES, PROSPECT_FIELDS, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { mapProspect } from '$lib/server/teable-map';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const status = url.searchParams.get('status') || '';
  const q = (url.searchParams.get('q') || '').toLowerCase();

  const [prospectRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.prospects),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  let filtered = prospectRecs;
  if (status) filtered = filtered.filter((r) => r.fields[PROSPECT_FIELDS.status] === status);
  if (q) {
    filtered = filtered.filter((r) => {
      const hay = `${r.fields[PROSPECT_FIELDS.name] ?? ''} ${r.fields[PROSPECT_FIELDS.email] ?? ''} ${r.fields[PROSPECT_FIELDS.firmaText] ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }

  const prospects = filtered
    .map((r) => mapProspect(r, firmaNameById.get(linkId(r.fields[PROSPECT_FIELDS.firma]) ?? '') ?? null))
    .sort((a, b) => {
      const av = a.versandt_am ?? '';
      const bv = b.versandt_am ?? '';
      if (av !== bv) return av ? (bv ? bv.localeCompare(av) : -1) : 1;
      return 0;
    });

  const countsByStatus = new Map<string, number>();
  for (const r of prospectRecs) {
    const s = (r.fields[PROSPECT_FIELDS.status] as string) ?? 'unbekannt';
    countsByStatus.set(s, (countsByStatus.get(s) ?? 0) + 1);
  }
  const counts = [...countsByStatus.entries()].map(([status, count]) => ({ status, count }));

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return { prospects, counts, total: prospectRecs.length, status, q, companies };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim();
    if (!name) return fail(400, { error: 'Name fehlt' });
    await createRecord(TABLES.prospects, {
      [PROSPECT_FIELDS.name]: name,
      [PROSPECT_FIELDS.vorname]: d.get('vorname') || null,
      [PROSPECT_FIELDS.nachname]: d.get('nachname') || null,
      [PROSPECT_FIELDS.titel]: d.get('titel') || null,
      [PROSPECT_FIELDS.anrede]: d.get('anrede') || null,
      [PROSPECT_FIELDS.email]: d.get('email') || null,
      [PROSPECT_FIELDS.firmaText]: d.get('firma') || null,
      [PROSPECT_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
      [PROSPECT_FIELDS.rolle]: d.get('rolle') || null,
      [PROSPECT_FIELDS.telefon]: d.get('telefon') || null,
      [PROSPECT_FIELDS.website]: d.get('website') || null,
      [PROSPECT_FIELDS.notizen]: d.get('notizen') || null,
      [PROSPECT_FIELDS.status]: (d.get('status') as string) || 'gesendet',
      [PROSPECT_FIELDS.kanal]: d.get('kanal') || 'email',
      [PROSPECT_FIELDS.versandtAm]: d.get('versandt_am') || null,
      [PROSPECT_FIELDS.followupAm]: d.get('followup_am') || null,
      [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
    });
    return { success: true };
  },

  update_status: async ({ request }) => {
    const d = await request.formData();
    await updateRecord(TABLES.prospects, d.get('id') as string, {
      [PROSPECT_FIELDS.status]: d.get('status') as string
    });
    return { success: true };
  },

  set_followup: async ({ request }) => {
    const d = await request.formData();
    await updateRecord(TABLES.prospects, d.get('id') as string, {
      [PROSPECT_FIELDS.followupAm]: (d.get('followup_am') as string) || null
    });
    return { success: true };
  },

  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const name = (d.get('name') as string)?.trim() || 'Unbekannt';
    await updateRecord(TABLES.prospects, id, {
      [PROSPECT_FIELDS.name]: name,
      [PROSPECT_FIELDS.vorname]: d.get('vorname') || null,
      [PROSPECT_FIELDS.nachname]: d.get('nachname') || null,
      [PROSPECT_FIELDS.titel]: d.get('titel') || null,
      [PROSPECT_FIELDS.anrede]: d.get('anrede') || null,
      [PROSPECT_FIELDS.email]: d.get('email') || null,
      [PROSPECT_FIELDS.firmaText]: d.get('firma') || null,
      [PROSPECT_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
      [PROSPECT_FIELDS.rolle]: d.get('rolle') || null,
      [PROSPECT_FIELDS.telefon]: d.get('telefon') || null,
      [PROSPECT_FIELDS.website]: d.get('website') || null,
      [PROSPECT_FIELDS.notizen]: d.get('notizen') || null,
      [PROSPECT_FIELDS.status]: (d.get('status') as string) || 'gesendet',
      [PROSPECT_FIELDS.kanal]: d.get('kanal') || 'email',
      [PROSPECT_FIELDS.versandtAm]: d.get('versandt_am') || null,
      [PROSPECT_FIELDS.followupAm]: d.get('followup_am') || null
    });
    return { success: true };
  },

  promote: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const p = await getRecord(TABLES.prospects, id);
    if (!p) return fail(404, { error: 'Nicht gefunden' });

    let firmaId = linkId(p.fields[PROSPECT_FIELDS.firma]);
    const firmaText = p.fields[PROSPECT_FIELDS.firmaText] as string | null;
    if (!firmaId && firmaText) {
      const allFirmen = await listRecords(TABLES.firmen);
      const existing = allFirmen.find((f) => String(f.fields[FIRMEN_FIELDS.name] ?? '').toLowerCase() === firmaText.toLowerCase());
      firmaId = existing ? existing.id : (await createRecord(TABLES.firmen, { [FIRMEN_FIELDS.name]: firmaText, [FIRMEN_FIELDS.website]: p.fields[PROSPECT_FIELDS.website] ?? null })).id;
    }

    const created = await createRecord(TABLES.kontakteReal, {
      [KONTAKTE_FIELDS.name]: p.fields[PROSPECT_FIELDS.name],
      [KONTAKTE_FIELDS.vorname]: p.fields[PROSPECT_FIELDS.vorname],
      [KONTAKTE_FIELDS.nachname]: p.fields[PROSPECT_FIELDS.nachname],
      [KONTAKTE_FIELDS.titel]: p.fields[PROSPECT_FIELDS.titel],
      [KONTAKTE_FIELDS.anrede]: p.fields[PROSPECT_FIELDS.anrede],
      [KONTAKTE_FIELDS.email]: p.fields[PROSPECT_FIELDS.email],
      [KONTAKTE_FIELDS.firma]: firmaId ? [{ id: firmaId }] : null,
      [KONTAKTE_FIELDS.rolle]: p.fields[PROSPECT_FIELDS.rolle],
      [KONTAKTE_FIELDS.telefon]: p.fields[PROSPECT_FIELDS.telefon],
      [KONTAKTE_FIELDS.notizen]: p.fields[PROSPECT_FIELDS.notizen]
    });

    await deleteRecord(TABLES.prospects, id);
    return { success: true, contact_id: created.id };
  },

  delete: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.prospects, d.get('id') as string);
    return { success: true };
  },

  import_csv: async ({ request }) => {
    const d = await request.formData();
    const rows = JSON.parse(d.get('rows') as string) as Record<string, string>[];
    if (!rows?.length) return fail(400, { error: 'Keine Daten' });

    const existingAll = await listRecords(TABLES.prospects);
    const existingEmails = new Set(
      existingAll.map((r) => String(r.fields[PROSPECT_FIELDS.email] ?? '').toLowerCase()).filter(Boolean)
    );

    let count = 0;
    for (const row of rows) {
      const name = (row.name || [row.vorname, row.nachname].filter(Boolean).join(' ') || row.Name || '').trim();
      if (!name) continue;
      const email = (row.email || row.Email || row['E-Mail'] || '').toLowerCase();
      // Mirrors the old ON CONFLICT DO NOTHING behavior (best-effort dedupe by email).
      if (email && existingEmails.has(email)) continue;

      await createRecord(TABLES.prospects, {
        [PROSPECT_FIELDS.name]: name,
        [PROSPECT_FIELDS.vorname]: row.vorname || row.Vorname || null,
        [PROSPECT_FIELDS.nachname]: row.nachname || row.Nachname || null,
        [PROSPECT_FIELDS.titel]: row.titel || row.Titel || null,
        [PROSPECT_FIELDS.anrede]: row.anrede || row.Anrede || null,
        [PROSPECT_FIELDS.email]: row.email || row.Email || row['E-Mail'] || null,
        [PROSPECT_FIELDS.firmaText]: row.firma || row.Firma || row.kanzlei || row.Kanzlei || null,
        [PROSPECT_FIELDS.rolle]: row.rolle || row.Rolle || row.position || null,
        [PROSPECT_FIELDS.telefon]: row.telefon || row.Telefon || row.phone || null,
        [PROSPECT_FIELDS.website]: row.website || row.Website || null,
        [PROSPECT_FIELDS.status]: 'gesendet',
        [PROSPECT_FIELDS.versandtAm]: row.versandt_am || row.datum || null,
        [PROSPECT_FIELDS.herkunft]: 'einzelansprache'
      });
      if (email) existingEmails.add(email);
      count++;
    }
    return { success: true, count };
  }
};
