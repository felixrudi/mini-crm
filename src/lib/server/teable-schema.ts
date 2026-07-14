// src/lib/server/teable-schema.ts
// Single source of truth for CRM table IDs + exact field-name strings.
// IDs filled in from Task 1 (2026-07-14, base felix_base bseJqfV4E4Ri1QYjUUL,
// created via Henry's scripts/create_crm_teable_schema.py).

export const TABLES = {
  firmen: 'tbl58ahoWar7wVxWHjA',
  kontakteReal: 'tblnTqgSMBRZLWINOp6',
  interaktionenReal: 'tblNE3WqZkqafOGS9f1',
  aufgabenReal: 'tblZBgkRKvvVeckzZaP',
  prospects: 'tbl6LjxihnKhe0I5A1L'
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
