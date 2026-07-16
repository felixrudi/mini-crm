// src/lib/server/contact-filters.ts
import { KONTAKTE_FIELDS } from './teable-schema.ts';

export type TagMode = 'and' | 'or';
export type SortKey = 'name' | 'company' | 'tags';

export type ContactFilterParams = {
  q: string;
  tags: string[];
  tagsExclude?: string[];
  tagMode: TagMode;
  kanal: string;
  ort: string;
};

export function matchesContactFilters(
  fields: Record<string, unknown>,
  { q, tags, tagsExclude, tagMode, kanal, ort }: ContactFilterParams
): boolean {
  if (q) {
    const hay = `${fields[KONTAKTE_FIELDS.name] ?? ''} ${fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  const recordTags = (fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [];
  if (tags.length > 0) {
    const matches =
      tagMode === 'and'
        ? tags.every((t) => recordTags.includes(t))
        : tags.some((t) => recordTags.includes(t));
    if (!matches) return false;
  }
  if (tagsExclude && tagsExclude.length > 0) {
    if (tagsExclude.some((t) => recordTags.includes(t))) return false;
  }
  if (kanal === 'whatsapp' && !fields[KONTAKTE_FIELDS.whatsapp]) return false;
  if (kanal === 'wechat' && !fields[KONTAKTE_FIELDS.wechatId]) return false;
  if (ort && fields[KONTAKTE_FIELDS.ort] !== ort) return false;
  return true;
}

export function sortContacts<T extends { name: string; company_name: string | null; tags?: string[] }>(
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
