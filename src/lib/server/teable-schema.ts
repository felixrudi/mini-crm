// src/lib/server/teable-schema.ts
// Single source of truth for CRM table IDs + exact field-name strings.
// IDs filled in from Task 1 (2026-07-14, base felix_base bseJqfV4E4Ri1QYjUUL,
// created via Henry's scripts/create_crm_teable_schema.py).

export const TABLES = {
  firmen: 'tbl58ahoWar7wVxWHjA',
  kontakteReal: 'tblnTqgSMBRZLWINOp6',
  interaktionenReal: 'tblNE3WqZkqafOGS9f1',
  prospects: 'tbl6LjxihnKhe0I5A1L',
  ansichten: 'tblXQi0wnkZPOWtqh4i',
  outreach: 'tblLHWeNN9dq1ObUE0D'
} as const;

export const OUTREACH_FIELDS = {
  kontakt: 'Kontakt',
  status: 'Status',
  versandtAm: 'Versandt am',
  gesendetUeber: 'Gesendet über',
  kanal: 'Kanal',
  followUpFaellig: 'Follow-up fällig',
  followUpGesendet: 'Follow-up gesendet',
  antwortKurzfassung: 'Antwort (Kurzfassung)',
  notiz: 'Notiz'
} as const;

export const FIRMEN_FIELDS = {
  name: 'Name',
  website: 'Website',
  telefon: 'Telefon',
  strasse: 'Straße',
  plz: 'PLZ',
  ort: 'Ort',
  land: 'Land',
  notizen: 'Notizen',
  tags: 'Tags'
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

export const ANSICHTEN_FIELDS = {
  name: 'Name',
  seite: 'Seite',
  filter: 'Filter',
  erstelltAm: 'Erstellt am'
} as const;
