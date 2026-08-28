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
    group: f.group ?? ''
  });
}

export function filtersEqual(a: ViewFilter, b: ViewFilter): boolean {
  return norm(a) === norm(b);
}

/** CRM-Listen: ohne Tag-Filter, aber archiv ausgeschlossen. */
export function defaultListFilter(_seite?: Seite): ViewFilter {
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

/** Seit dem Wegfall der Outreach-Listen (28.08.2026) hat jede Liste den
 *  Umschalter Aktuell/Alle — die Funktion bleibt als Angelpunkt bestehen. */
export function hatArchivUmschalter(_seite?: Seite): boolean {
  return true;
}
