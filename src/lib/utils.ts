import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dtf = new Intl.DateTimeFormat('de-AT', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return dtf.format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

// Link-Text fürs Website-Feld: Karten-Links als Label, überlange URLs nur als Domain —
// das Feld enthält z.T. Google-Maps-Lang-URLs (~200 Zeichen), die als Volltext umbrechen.
export function websiteLabel(url: string): string {
  const stripped = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  try {
    const host = new URL(url.match(/^https?:\/\//) ? url : `https://${url}`).hostname;
    if (/(^|\.)google\.[a-z.]+$/.test(host) && /\/maps(\/|$|\?)/.test(url)) return 'Google Maps';
    if (host === 'maps.app.goo.gl' || host === 'goo.gl') return 'Google Maps';
    if (stripped.length > 50) return host;
  } catch {
    // kein parsebarer URL — Rohtext anzeigen
  }
  return stripped;
}
