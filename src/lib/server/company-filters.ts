// src/lib/server/company-filters.ts
import { FIRMEN_FIELDS } from './teable-schema.ts';

export type TagMode = 'and' | 'or';
export type CompanySortKey = 'name' | 'contacts' | 'tags';

export type CompanyFilterParams = {
  q?: string;
  tags: string[];
  tagsExclude?: string[];
  tagMode: TagMode;
  ort: string;
};

export function matchesCompanyFilters(
  fields: Record<string, unknown>,
  { q, tags, tagsExclude, tagMode, ort }: CompanyFilterParams
): boolean {
  if (q) {
    const recordTags = (fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? [];
    const hay = [
      fields[FIRMEN_FIELDS.name],
      fields[FIRMEN_FIELDS.website],
      fields[FIRMEN_FIELDS.telefon],
      fields[FIRMEN_FIELDS.notizen],
      fields[FIRMEN_FIELDS.ort],
      fields[FIRMEN_FIELDS.strasse],
      fields[FIRMEN_FIELDS.plz],
      recordTags.join(' ')
    ]
      .map((v) => (v ?? '').toString())
      .join(' ')
      .toLowerCase();
    if (!hay.includes(q.toLowerCase())) return false;
  }
  const recordTags = (fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? [];
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
  if (ort && fields[FIRMEN_FIELDS.ort] !== ort) return false;
  return true;
}

export function sortCompanies<T extends { name: string; contact_count: number; tags?: string[] }>(
  companies: T[],
  sort: CompanySortKey
): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  if (sort === 'contacts') {
    return companies.sort((a, b) => b.contact_count - a.contact_count || byName(a, b));
  }
  if (sort === 'tags') {
    return companies.sort((a, b) => (b.tags?.length ?? 0) - (a.tags?.length ?? 0) || byName(a, b));
  }
  return companies.sort(byName);
}
