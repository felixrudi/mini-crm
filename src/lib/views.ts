// src/lib/views.ts
// Client-sicherer Filter-Vergleich für die Tab-Leiste (ViewTabs.svelte).
import type { Seite, ViewFilter } from './types';
import { DEFAULT_TAGS_EXCLUDE } from './tags';

function norm(f: ViewFilter): string {
  return JSON.stringify({
    q: f.q ?? '',
    tags: [...(f.tags ?? [])].sort(),
    tagsExclude: [...(f.tagsExclude ?? [])].sort(),
    tagMode: f.tagMode ?? 'or',
    kanal: f.kanal ?? '',
    ort: f.ort ?? '',
    sort: f.sort ?? 'name',
    group: f.group ?? '',
    pstatus: f.pstatus ?? '',
    psort: f.psort ?? 'versandt',
    pgroup: f.pgroup ?? '',
    osort: f.osort ?? 'name',
    ogroup: f.ogroup ?? ''
  });
}

export function filtersEqual(a: ViewFilter, b: ViewFilter): boolean {
  return norm(a) === norm(b);
}

/** CRM-Listen: ohne Tag-Filter, aber archiv ausgeschlossen. Outreach: leer. */
export function defaultListFilter(seite?: Seite): ViewFilter {
  if (seite === 'kontakte-outreach' || seite === 'firmen-outreach') return {};
  return { tagsExclude: [...DEFAULT_TAGS_EXCLUDE] };
}

export function isDefaultFilter(f: ViewFilter, seite?: Seite): boolean {
  return norm(f) === norm(defaultListFilter(seite));
}

/** CRM-Listen: nichts ausgeschlossen, also auch Archiviertes. */
export function allListFilter(): ViewFilter {
  return { tagsExclude: [] };
}

export function isAllFilter(f: ViewFilter): boolean {
  return norm(f) === norm(allListFilter());
}

/** Outreach-Listen kennen keine Tags — dort ist die Standardansicht schon „Alle". */
export function hatArchivUmschalter(seite?: Seite): boolean {
  return seite !== 'kontakte-outreach' && seite !== 'firmen-outreach';
}
