// Client-side detail panel navigation: stays on current route, sets ?detail=
import { goto } from '$app/navigation';

export type DetailType = 'contact' | 'company';

export type DetailTarget = {
  type: DetailType;
  id: string;
};

export function parseDetailParam(raw: string | null | undefined): DetailTarget | null {
  if (!raw) return null;
  const m = raw.match(/^(contact|company):(.+)$/);
  if (!m) return null;
  return { type: m[1] as DetailType, id: m[2] };
}

function setDetailParam(value: string | null) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value) url.searchParams.set('detail', value);
  else url.searchParams.delete('detail');
  const next = url.pathname + url.search + url.hash;
  goto(next, { keepFocus: true, noScroll: true, replaceState: false });
}

export function openContact(id: string) {
  setDetailParam(`contact:${id}`);
}

export function openCompany(id: string) {
  setDetailParam(`company:${id}`);
}

export function closeDetail() {
  setDetailParam(null);
}

export function openDetail(type: DetailType, id: string) {
  if (type === 'contact') openContact(id);
  else openCompany(id);
}
