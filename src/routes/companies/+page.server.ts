import { listRecords, createRecord, updateRecord, deleteRecord, getRecord, linkId } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { matchesCompanyFilters, sortCompanies } from '$lib/server/company-filters';
import type { TagMode, CompanySortKey } from '$lib/server/company-filters';
import { listViews } from '$lib/server/views';
import { renameTagBulk } from '$lib/server/tag-rename';
import { isRecordId } from '$lib/server/validation';
import { addArchivTag } from '$lib/server/archive';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function parseTags(d: FormData): string[] {
  const raw = (d.get('tags') as string) || '';
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const tagsParam = url.searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];
  // Default: archiv ausblenden (wie Kontakte). `tagsExclude=` = alle inkl. Archiv.
  const tagsExcludeParam = url.searchParams.get('tagsExclude');
  const tagsExclude =
    tagsExcludeParam === null
      ? ['archiv']
      : tagsExcludeParam.split(',').map((t) => t.trim()).filter(Boolean);
  const tagMode: TagMode = url.searchParams.get('mode') === 'and' ? 'and' : 'or';
  const ort = url.searchParams.get('ort') || '';
  const group = url.searchParams.get('group') === 'tags' ? 'tags' : '';
  const sort = ((): CompanySortKey => {
    const s = url.searchParams.get('sort');
    return s === 'contacts' || s === 'tags' ? s : 'name';
  })();
  const [firmenRecs, kontakteRecs, views] = await Promise.all([
    listRecords(TABLES.firmen),
    listRecords(TABLES.kontakteReal),
    listViews('firmen')
  ]);

  const contactCountByCompany = new Map<string, number>();
  const contactNamesByCompany = new Map<string, string[]>();
  for (const k of kontakteRecs) {
    const companyId = linkId(k.fields[KONTAKTE_FIELDS.firma]);
    if (companyId) {
      contactCountByCompany.set(companyId, (contactCountByCompany.get(companyId) ?? 0) + 1);
      const arr = contactNamesByCompany.get(companyId) ?? [];
      arr.push(k.fields[KONTAKTE_FIELDS.name] as string);
      contactNamesByCompany.set(companyId, arr);
    }
  }

  const needle = q.trim().toLowerCase();
  const companies = sortCompanies(
    firmenRecs
      // Tag/Ort-Filter zuerst; Textsuche (inkl. Kontaktnamen) nach dem Map.
      .filter((r) => matchesCompanyFilters(r.fields, { tags, tagsExclude, tagMode, ort }))
      .map((r) => ({
        id: r.id,
        name: r.fields[FIRMEN_FIELDS.name] as string,
        website: (r.fields[FIRMEN_FIELDS.website] as string) ?? null,
        telefon: (r.fields[FIRMEN_FIELDS.telefon] as string) ?? null,
        strasse: (r.fields[FIRMEN_FIELDS.strasse] as string) ?? null,
        plz: (r.fields[FIRMEN_FIELDS.plz] as string) ?? null,
        ort: (r.fields[FIRMEN_FIELDS.ort] as string) ?? null,
        land: (r.fields[FIRMEN_FIELDS.land] as string) ?? null,
        notizen: (r.fields[FIRMEN_FIELDS.notizen] as string) ?? null,
        tags: (r.fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? [],
        created_at: r.createdTime ?? '',
        contact_count: contactCountByCompany.get(r.id) ?? 0,
        contact_names: contactNamesByCompany.get(r.id) ?? []
      }))
      .filter((c) => {
        if (!needle) return true;
        const hay = [
          c.name,
          c.website,
          c.telefon,
          c.notizen,
          c.ort,
          c.strasse,
          c.plz,
          (c.tags ?? []).join(' '),
          (c.contact_names ?? []).join(' ')
        ]
          .map((v) => (v ?? '').toString())
          .join(' ')
          .toLowerCase();
        return hay.includes(needle);
      }),
    sort
  );

  const allTags = [...new Set(firmenRecs.flatMap((r) => (r.fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? []))].sort();
  const allOrte = [...new Set(
    firmenRecs.map((r) => r.fields[FIRMEN_FIELDS.ort] as string | undefined).filter((o): o is string => Boolean(o))
  )].sort();

  return {
    companies,
    q,
    tags,
    tagsExclude,
    tagMode,
    ort,
    sort,
    group,
    allTags,
    allOrte,
    views
  };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim();
    if (!name) return fail(400, { error: 'Name erforderlich' });
    await createRecord(TABLES.firmen, {
      [FIRMEN_FIELDS.name]: name,
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.telefon]: d.get('telefon') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null,
      [FIRMEN_FIELDS.tags]: parseTags(d)
    });
    return { success: true };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    if (!isRecordId(id)) return fail(400, { error: 'Ungültige ID' });
    await updateRecord(TABLES.firmen, id, {
      [FIRMEN_FIELDS.name]: d.get('name'),
      [FIRMEN_FIELDS.website]: d.get('website') || null,
      [FIRMEN_FIELDS.telefon]: d.get('telefon') || null,
      [FIRMEN_FIELDS.strasse]: d.get('strasse') || null,
      [FIRMEN_FIELDS.plz]: d.get('plz') || null,
      [FIRMEN_FIELDS.ort]: d.get('ort') || null,
      [FIRMEN_FIELDS.land]: d.get('land') || null,
      [FIRMEN_FIELDS.notizen]: d.get('notizen') || null,
      [FIRMEN_FIELDS.tags]: parseTags(d)
    });
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id');
    if (!isRecordId(id)) return fail(400, { error: 'Ungültige ID' });
    const record = await getRecord<Record<string, unknown>>(TABLES.firmen, id);
    const tags = addArchivTag(record?.fields[FIRMEN_FIELDS.tags]);
    await updateRecord(TABLES.firmen, id, { [FIRMEN_FIELDS.tags]: tags });
    return { success: true };
  },
  rename_tag: async ({ request }) => {
    const d = await request.formData();
    const oldTag = ((d.get('oldTag') as string) || '').trim().toLowerCase();
    const newTag = ((d.get('newTag') as string) || '').trim().toLowerCase();
    if (!oldTag || !newTag) return fail(400, { error: 'Alter und neuer Tag-Name erforderlich' });
    const count = await renameTagBulk(TABLES.firmen, FIRMEN_FIELDS.tags, oldTag, newTag);
    return { success: true, count };
  }
};
