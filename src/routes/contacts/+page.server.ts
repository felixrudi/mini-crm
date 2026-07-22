import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS, PROSPECT_FIELDS } from '$lib/server/teable-schema';
import { mapContact, mapProspect } from '$lib/server/teable-map';
import { matchesContactFilters, sortContacts } from '$lib/server/contact-filters';
import type { TagMode, SortKey } from '$lib/server/contact-filters';
import { listViews } from '$lib/server/views';
import { renameTagBulk } from '$lib/server/tag-rename';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const db = url.searchParams.get('db') === 'outreach' ? 'outreach' : 'crm';
  const q = url.searchParams.get('q') || '';
  const kanal = url.searchParams.get('kanal') || '';
  const ort = url.searchParams.get('ort') || '';
  const group = url.searchParams.get('group') === 'tags' ? 'tags' : '';
  const sort = ((): SortKey => {
    const s = url.searchParams.get('sort');
    return s === 'company' || s === 'tags' ? s : 'name';
  })();
  const tagMode: TagMode = url.searchParams.get('mode') === 'and' ? 'and' : 'or';

  // 'tags' (Komma-Liste) ist der aktuelle Mehrfach-Filter-Parameter. Das alte
  // einzelne 'tag' bleibt als Fallback gültig, damit bestehende/geteilte
  // Links weiterhin funktionieren.
  const tagsParam = url.searchParams.get('tags');
  const legacyTag = url.searchParams.get('tag');
  const tags = tagsParam
    ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean)
    : legacyTag
      ? [legacyTag]
      : [];

  // NICHT-Tags: Kontakte mit einem dieser Tags werden aus der Liste entfernt.
  // Default (Param fehlt): archiv ausblenden — „Aktuelle“ Liste.
  // Explizit leer (`tagsExclude=`): alle inkl. Archiv.
  const tagsExcludeParam = url.searchParams.get('tagsExclude');
  const tagsExclude =
    tagsExcludeParam === null
      ? ['archiv']
      : tagsExcludeParam.split(',').map((t) => t.trim()).filter(Boolean);

  const pq = (url.searchParams.get('pq') || '').toLowerCase();
  const pstatus = url.searchParams.get('pstatus') || '';
  const psort = ((): 'versandt' | 'name' | 'status' => {
    const s = url.searchParams.get('psort');
    return s === 'name' || s === 'status' ? s : 'versandt';
  })();
  // Prospects haben kein Tags-Feld in Teable — Gruppierung hier läuft daher
  // über die Outreach-Phase (Status), nicht über Tags.
  const pgroup = url.searchParams.get('pgroup') === 'status' ? 'status' : '';

  const [kontakteRecs, firmenRecs, views, prospectRecs, interaktionenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen),
    listViews(db === 'outreach' ? 'kontakte-outreach' : 'kontakte'),
    listRecords(TABLES.prospects),
    listRecords(TABLES.interaktionenReal)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  const lastActivityByContact = new Map<string, string>();
  for (const i of interaktionenRecs) {
    const cid = linkId(i.fields[INTERAKTIONEN_FIELDS.kontakt]);
    const datum = i.fields[INTERAKTIONEN_FIELDS.datum] as string;
    if (!cid || !datum) continue;
    const cur = lastActivityByContact.get(cid);
    if (!cur || datum > cur) lastActivityByContact.set(cid, datum);
  }

  const contacts = sortContacts(
    kontakteRecs
      .filter((r) => matchesContactFilters(r.fields, { q, tags, tagsExclude, tagMode, kanal, ort }))
      .map((r) => ({
        ...mapContact(r, firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null),
        last_activity: lastActivityByContact.get(r.id) ?? null
      })),
    sort
  );

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();
  const allOrte = [...new Set(
    kontakteRecs.map((r) => r.fields[KONTAKTE_FIELDS.ort] as string | undefined).filter((o): o is string => Boolean(o))
  )].sort();

  // --- Outreach-Marketing (Prospects) ---
  let prospects = prospectRecs.map((r) =>
    mapProspect(r, firmaNameById.get(linkId(r.fields[PROSPECT_FIELDS.firma]) ?? '') ?? null)
  );
  if (pstatus) prospects = prospects.filter((p) => p.status === pstatus);
  if (pq) {
    prospects = prospects.filter((p) =>
      `${p.name} ${p.email ?? ''} ${p.firma ?? ''} ${p.company_name ?? ''}`.toLowerCase().includes(pq)
    );
  }
  if (psort === 'name') {
    prospects.sort((a, b) => a.name.localeCompare(b.name));
  } else if (psort === 'status') {
    prospects.sort((a, b) => (a.status ?? '').localeCompare(b.status ?? '') || a.name.localeCompare(b.name));
  } else {
    prospects.sort((a, b) => {
      const av = a.versandt_am ?? '';
      const bv = b.versandt_am ?? '';
      if (av !== bv) return av ? (bv ? bv.localeCompare(av) : -1) : 1;
      return a.name.localeCompare(b.name);
    });
  }

  return {
    db,
    contacts,
    companies,
    q,
    tags,
    tagsExclude,
    tagMode,
    kanal,
    ort,
    sort,
    group,
    allTags,
    allOrte,
    views,
    prospects,
    pq,
    pstatus,
    psort,
    pgroup
  };
};

function parseTags(d: FormData): string[] {
  const raw = (d.get('tags') as string) || '';
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

function extractContactFields(d: FormData) {
  const name = (d.get('name') as string)?.trim() || 'Unbekannt';
  return {
    [KONTAKTE_FIELDS.name]: name,
    [KONTAKTE_FIELDS.vorname]: d.get('vorname') || null,
    [KONTAKTE_FIELDS.nachname]: d.get('nachname') || null,
    [KONTAKTE_FIELDS.titel]: d.get('titel') || null,
    [KONTAKTE_FIELDS.anrede]: d.get('anrede') || null,
    [KONTAKTE_FIELDS.strasse]: d.get('strasse') || null,
    [KONTAKTE_FIELDS.plz]: d.get('plz') || null,
    [KONTAKTE_FIELDS.ort]: d.get('ort') || null,
    [KONTAKTE_FIELDS.geburtstag]: d.get('geburtstag') || null,
    [KONTAKTE_FIELDS.firma]: d.get('company_id') ? [{ id: d.get('company_id') as string }] : null,
    [KONTAKTE_FIELDS.rolle]: d.get('rolle') || null,
    [KONTAKTE_FIELDS.email]: d.get('email') || null,
    [KONTAKTE_FIELDS.telefon]: d.get('telefon') || null,
    [KONTAKTE_FIELDS.telefon2]: d.get('telefon2') || null,
    [KONTAKTE_FIELDS.whatsapp]: d.get('whatsapp') || null,
    [KONTAKTE_FIELDS.wechatId]: d.get('wechat_id') || null,
    [KONTAKTE_FIELDS.linkedinUrl]: d.get('linkedin_url') || null,
    [KONTAKTE_FIELDS.notizen]: d.get('notizen') || null,
    [KONTAKTE_FIELDS.iban]: d.get('iban') || null,
    [KONTAKTE_FIELDS.tags]: parseTags(d)
  };
}

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const rec = await createRecord(TABLES.kontakteReal, extractContactFields(d));
    return { success: true, id: rec.id };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    await updateRecord(TABLES.kontakteReal, id, extractContactFields(d));
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await deleteRecord(TABLES.kontakteReal, d.get('id') as string);
    return { success: true };
  },
  rename_tag: async ({ request }) => {
    const d = await request.formData();
    const oldTag = ((d.get('oldTag') as string) || '').trim().toLowerCase();
    const newTag = ((d.get('newTag') as string) || '').trim().toLowerCase();
    if (!oldTag || !newTag) return fail(400, { error: 'Alter und neuer Tag-Name erforderlich' });
    const count = await renameTagBulk(TABLES.kontakteReal, KONTAKTE_FIELDS.tags, oldTag, newTag);
    return { success: true, count };
  }
};
