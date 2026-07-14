import { listRecords, createRecord, updateRecord, deleteRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact } from '$lib/server/teable-map';
import type { Actions, PageServerLoad } from './$types';

type TagMode = 'and' | 'or';
type SortKey = 'name' | 'company' | 'tags';

function matchesFilters(
  fields: Record<string, unknown>,
  { q, tags, tagMode, kanal }: { q: string; tags: string[]; tagMode: TagMode; kanal: string }
): boolean {
  if (q) {
    const hay = `${fields[KONTAKTE_FIELDS.name] ?? ''} ${fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  if (tags.length > 0) {
    const recordTags = (fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [];
    const matches =
      tagMode === 'and'
        ? tags.every((t) => recordTags.includes(t))
        : tags.some((t) => recordTags.includes(t));
    if (!matches) return false;
  }
  if (kanal === 'whatsapp' && !fields[KONTAKTE_FIELDS.whatsapp]) return false;
  if (kanal === 'wechat' && !fields[KONTAKTE_FIELDS.wechatId]) return false;
  return true;
}

function sortContacts<T extends { name: string; company_name: string | null; tags?: string[] }>(
  contacts: T[],
  sort: SortKey
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  if (sort === 'company') {
    return contacts.sort((a, b) => (a.company_name ?? '').localeCompare(b.company_name ?? '') || byName(a, b));
  }
  if (sort === 'tags') {
    return contacts.sort((a, b) => (b.tags?.length ?? 0) - (a.tags?.length ?? 0) || byName(a, b));
  }
  return contacts.sort(byName);
}

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const kanal = url.searchParams.get('kanal') || '';
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

  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  const contacts = sortContacts(
    kontakteRecs
      .filter((r) => matchesFilters(r.fields, { q, tags, tagMode, kanal }))
      .map((r) => mapContact(r, firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null)),
    sort
  );

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();

  return { contacts, companies, q, tags, tagMode, kanal, sort, allTags };
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
  }
};
