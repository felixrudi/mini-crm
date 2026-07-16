// src/lib/views.ts
// Client-sicherer Filter-Vergleich für die Tab-Leiste (ViewTabs.svelte).
import type { ViewFilter } from './types';

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

export function isDefaultFilter(f: ViewFilter): boolean {
  return norm(f) === norm({});
}
