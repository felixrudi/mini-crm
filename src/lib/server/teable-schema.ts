// src/lib/server/teable-schema.ts
// Single source of truth for CRM table IDs + exact field-name strings.
// IDs filled in from Task 1 — replace the tbl_TODO placeholders before Task 3.

export const TABLES = {
  firmen: 'tbl_TODO_firmen',
  kontakteReal: 'tbl_TODO_kontakte_real',
  interaktionenReal: 'tbl_TODO_interaktionen_real',
  aufgabenReal: 'tbl_TODO_aufgaben_real',
  prospects: 'tbl_TODO_prospects'
} as const;

export const FIRMEN_FIELDS = {
  name: 'Name',
  website: 'Website',
  strasse: 'Straße',
  plz: 'PLZ',
  ort: 'Ort',
  land: 'Land',
  notizen: 'Notizen'
} as const;

export const KONTAKTE_FIELDS = {
  firma: 'Firma',
  firmaName: 'Firma-Name',
  name: 'Name',
  vorname: 'Vorname',
  nachname: 'Nachname',
  titel: 'Titel',
  anrede: 'Anrede',
  strasse: 'Straße',
  plz: 'PLZ',
  ort: 'Ort',
  geburtstag: 'Geburtstag',
  email: 'Email',
  telefon: 'Telefon',
  telefon2: 'Telefon 2',
  whatsapp: 'WhatsApp',
  wechatId: 'WeChat-ID',
  linkedinUrl: 'LinkedIn-URL',
  rolle: 'Rolle',
  notizen: 'Notizen',
  tags: 'Tags',
  iban: 'IBAN',
  foto: 'Foto',
  dateien: 'Dateien'
} as const;

export const INTERAKTIONEN_FIELDS = {
  kontakt: 'Kontakt',
  typ: 'Typ',
  datum: 'Datum',
  titel: 'Titel',
  text: 'Text',
  von: 'Von',
  an: 'An'
} as const;

export const AUFGABEN_FIELDS = {
  kontakt: 'Kontakt',
  titel: 'Titel',
  status: 'Status',
  faelligAm: 'Fällig am',
  notizen: 'Notizen'
} as const;

export const PROSPECT_FIELDS = {
  name: 'Name',
  vorname: 'Vorname',
  nachname: 'Nachname',
  titel: 'Titel',
  anrede: 'Anrede',
  email: 'Email',
  firmaText: 'Firma-Text',
  firma: 'Firma',
  rolle: 'Rolle',
  telefon: 'Telefon',
  website: 'Website',
  notizen: 'Notizen',
  status: 'Status',
  kanal: 'Kanal',
  versandtAm: 'Versandt am',
  followupAm: 'Follow-up am',
  sperre: 'Sperre',
  sperreGrund: 'Sperre-Grund',
  herkunft: 'Herkunft'
} as const;
