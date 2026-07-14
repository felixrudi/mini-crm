// src/lib/server/company-filters.ts
import { FIRMEN_FIELDS } from './teable-schema.ts';

export type TagMode = 'and' | 'or';
export type CompanySortKey = 'name' | 'contacts' | 'tags';

export type CompanyFilterParams = {
  tags: string[];
  tagMode: TagMode;
  ort: string;
};

export function matchesCompanyFilters(
  fields: Record<string, unknown>,
  { tags, tagMode, ort }: CompanyFilterParams
): boolean {
  if (tags.length > 0) {
    const recordTags = (fields[FIRMEN_FIELDS.tags] as string[] | undefined) ?? [];
    const matches =
      tagMode === 'and'
        ? tags.every((t) => recordTags.includes(t))
        : tags.some((t) => recordTags.includes(t));
    if (!matches) return false;
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
