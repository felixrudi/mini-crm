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

export function istMapsLink(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url.match(/^https?:\/\//) ? url : `https://${url}`).hostname;
    if (host === 'maps.app.goo.gl' || host === 'goo.gl') return true;
    return /(^|\.)google\.[a-z.]+$/.test(host) && /\/maps(\/|$|\?)/.test(url);
  } catch {
    return false;
  }
}

// Link-Text fürs Website-Feld: Karten-Links als Label, überlange URLs nur als Domain —
// das Feld enthält z.T. Google-Maps-Lang-URLs (~200 Zeichen), die als Volltext umbrechen.
export function websiteLabel(url: string): string {
  if (istMapsLink(url)) return 'Google Maps';
  const stripped = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  try {
    const host = new URL(url.match(/^https?:\/\//) ? url : `https://${url}`).hostname;
    if (stripped.length > 50) return host;
  } catch {
    // kein parsebarer URL — Rohtext anzeigen
  }
  return stripped;
}

type Adresse = {
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  land?: string | null;
  website?: string | null;
};

export function adresseText(a: Adresse): string {
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(' '), a.land]
    .map((t) => (t ?? '').trim())
    .filter(Boolean)
    .join(', ');
}

// Karten-Link ohne gepflegtes Datenfeld: Google sucht die Adresse selbst.
// Ein im Website-Feld hinterlegter Maps-Link gewinnt — der zeigt auf den exakten
// Eintrag (Name, Öffnungszeiten), die erzeugte Suche nur auf die Hausnummer.
// Ohne Straße bliebe der Treffer die halbe Stadt, dafür lohnt der Knopf nicht.
export function karteUrl(a: Adresse): string | null {
  if (istMapsLink(a.website)) return a.website ?? null;
  // Straße allein ("Porzellangasse") landet irgendwo auf der Welt — Ort oder PLZ muss dazu.
  if (!a.strasse?.trim() || !(a.plz?.trim() || a.ort?.trim())) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseText(a))}`;
}
