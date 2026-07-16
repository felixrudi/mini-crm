import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS, KONTAKTE_FIELDS, PROSPECT_FIELDS } from '$lib/server/teable-schema';
import { matchesCompanyFilters, sortCompanies } from '$lib/server/company-filters';
import type { TagMode, CompanySortKey } from '$lib/server/company-filters';
import { listViews } from '$lib/server/views';
import { renameTagBulk } from '$lib/server/tag-rename';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function parseTags(d: FormData): string[] {
  const raw = (d.get('tags') as string) || '';
  return raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
}

export const load: PageServerLoad = async ({ url }) => {
  const db = url.searchParams.get('db') === 'outreach' ? 'outreach' : 'crm';
  const tagsParam = url.searchParams.get('tags');
  const tags = tagsParam ? tagsParam.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const tagsExcludeParam = url.searchParams.get('tagsExclude');
  const tagsExclude = tagsExcludeParam ? tagsExcludeParam.split(',').map((t) => t.trim()).filter(Boolean) : [];
  const tagMode: TagMode = url.searchParams.get('mode') === 'and' ? 'and' : 'or';
  const ort = url.searchParams.get('ort') || '';
  const group = url.searchParams.get('group') === 'tags' ? 'tags' : '';
  const sort = ((): CompanySortKey => {
    const s = url.searchParams.get('sort');
    return s === 'contacts' || s === 'tags' ? s : 'name';
  })();
  const oq = (url.searchParams.get('oq') || '').toLowerCase();
  // Outreach-Firmen sind aus Prospects abgeleitet (kein Tags-/Ort-Feld dort) —
  // Sortieren/Gruppieren spiegeln daher das Prospects-Muster (Name/Status/
  // zuletzt versandt bzw. Gruppierung nach Status), nicht Tags.
  const osort = ((): 'name' | 'status' | 'versandt' => {
    const s = url.searchParams.get('osort');
    return s === 'status' || s === 'versandt' ? s : 'name';
  })();
  const ogroup = url.searchParams.get('ogroup') === 'status' ? 'status' : '';

  const [firmenRecs, kontakteRecs, views, prospectRecs] = await Promise.all([
    listRecords(TABLES.firmen),
    listRecords(TABLES.kontakteReal),
    listViews(db === 'outreach' ? 'firmen-outreach' : 'firmen'),
    listRecords(TABLES.prospects)
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

  const companies = sortCompanies(
    firmenRecs
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
      })),
    sort
  );

  const allTags = [...new Set(firmenRecs.flatMap((r) => (r.fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? []))].sort();
  const allOrte = [...new Set(
    firmenRecs.map((r) => r.fields[FIRMEN_FIELDS.ort] as string | undefined).filter((o): o is string => Boolean(o))
  )].sort();

  // --- Outreach-Firmen: aus Prospects abgeleitet, eine Zeile pro eindeutiger Firma ---
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));
  type OutreachCompany = {
    key: string;
    name: string;
    website: string | null;
    prospects: { id: string; name: string; status: string; telefon: string | null }[];
    telefon: string | null;
    status: string;
    lastVersandt: string | null;
  };
  const byCompany = new Map<string, OutreachCompany>();
  for (const r of prospectRecs) {
    const firmaId = linkId(r.fields[PROSPECT_FIELDS.firma]);
    const firmaText = r.fields[PROSPECT_FIELDS.firmaText] as string | null;
    const name = (firmaId ? firmaNameById.get(firmaId) : null) ?? firmaText;
    if (!name) continue;
    const key = firmaId ?? name.toLowerCase();
    const versandt = (r.fields[PROSPECT_FIELDS.versandtAm] as string) ?? null;
    const entry = byCompany.get(key) ?? {
      key,
      name,
      website: (r.fields[PROSPECT_FIELDS.website] as string) ?? null,
      prospects: [],
      telefon: null,
      status: (r.fields[PROSPECT_FIELDS.status] as string) ?? 'gesendet',
      lastVersandt: null
    };
    entry.prospects.push({
      id: r.id,
      name: r.fields[PROSPECT_FIELDS.name] as string,
      status: (r.fields[PROSPECT_FIELDS.status] as string) ?? 'gesendet',
      telefon: (r.fields[PROSPECT_FIELDS.telefon] as string) ?? null
    });
    if (!entry.telefon && r.fields[PROSPECT_FIELDS.telefon]) entry.telefon = r.fields[PROSPECT_FIELDS.telefon] as string;
    if (!entry.website && r.fields[PROSPECT_FIELDS.website]) entry.website = r.fields[PROSPECT_FIELDS.website] as string;
    if (!entry.lastVersandt || (versandt && versandt > entry.lastVersandt)) {
      entry.lastVersandt = versandt;
      entry.status = (r.fields[PROSPECT_FIELDS.status] as string) ?? entry.status;
    }
    byCompany.set(key, entry);
  }
  let outreachCompanies = [...byCompany.values()];
  if (oq) outreachCompanies = outreachCompanies.filter((c) => c.name.toLowerCase().includes(oq));
  if (osort === 'status') {
    outreachCompanies.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
  } else if (osort === 'versandt') {
    outreachCompanies.sort((a, b) => {
      const av = a.lastVersandt ?? '';
      const bv = b.lastVersandt ?? '';
      if (av !== bv) return av ? (bv ? bv.localeCompare(av) : -1) : 1;
      return a.name.localeCompare(b.name);
    });
  } else {
    outreachCompanies.sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    db,
    companies,
    tags,
    tagsExclude,
    tagMode,
    ort,
    sort,
    group,
    allTags,
    allOrte,
    views,
    outreachCompanies,
    oq,
    osort,
    ogroup
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
    await deleteRecord(TABLES.firmen, d.get('id') as string);
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
