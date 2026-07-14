// src/lib/server/teable-map.ts
// Converts Teable {id, fields} records into the exact flat field shapes
// src/lib/types.ts and every .svelte template already expect — these shapes
// predate the Teable migration and are preserved so no .svelte file changes.
import type { TeableRecord } from './teable';
import { linkId } from './teable';
import { KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS, AUFGABEN_FIELDS, PROSPECT_FIELDS } from './teable-schema';

type Attachment = { id: string; name: string; mimetype?: string; mimeType?: string; url: string; timestamp?: string };

function firstAttachmentUrl(field: unknown): string | null {
  const atts = field as Attachment[] | undefined;
  return atts && atts.length > 0 ? atts[0].url : null;
}

export function mapCompany(r: TeableRecord, contactCount = 0) {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id,
    name: f[FIRMEN_FIELDS.name] as string,
    website: (f[FIRMEN_FIELDS.website] as string) ?? null,
    strasse: (f[FIRMEN_FIELDS.strasse] as string) ?? null,
    plz: (f[FIRMEN_FIELDS.plz] as string) ?? null,
    ort: (f[FIRMEN_FIELDS.ort] as string) ?? null,
    land: (f[FIRMEN_FIELDS.land] as string) ?? null,
    notizen: (f[FIRMEN_FIELDS.notizen] as string) ?? null,
    created_at: r.createdTime ?? null,
    contact_count: contactCount
  };
}

export function mapContact(r: TeableRecord, companyName: string | null = null) {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id,
    company_id: linkId(f[KONTAKTE_FIELDS.firma]),
    company_name: companyName,
    name: f[KONTAKTE_FIELDS.name] as string,
    vorname: (f[KONTAKTE_FIELDS.vorname] as string) ?? null,
    nachname: (f[KONTAKTE_FIELDS.nachname] as string) ?? null,
    titel: (f[KONTAKTE_FIELDS.titel] as string) ?? null,
    anrede: (f[KONTAKTE_FIELDS.anrede] as 'Herr' | 'Frau' | null) ?? null,
    strasse: (f[KONTAKTE_FIELDS.strasse] as string) ?? null,
    plz: (f[KONTAKTE_FIELDS.plz] as string) ?? null,
    ort: (f[KONTAKTE_FIELDS.ort] as string) ?? null,
    geburtstag: (f[KONTAKTE_FIELDS.geburtstag] as string) ?? null,
    email: (f[KONTAKTE_FIELDS.email] as string) ?? null,
    telefon: (f[KONTAKTE_FIELDS.telefon] as string) ?? null,
    telefon2: (f[KONTAKTE_FIELDS.telefon2] as string) ?? null,
    whatsapp: (f[KONTAKTE_FIELDS.whatsapp] as string) ?? null,
    wechat_id: (f[KONTAKTE_FIELDS.wechatId] as string) ?? null,
    linkedin_url: (f[KONTAKTE_FIELDS.linkedinUrl] as string) ?? null,
    rolle: (f[KONTAKTE_FIELDS.rolle] as string) ?? null,
    notizen: (f[KONTAKTE_FIELDS.notizen] as string) ?? null,
    photo: firstAttachmentUrl(f[KONTAKTE_FIELDS.foto]),
    tags: (f[KONTAKTE_FIELDS.tags] as string[]) ?? [],
    iban: (f[KONTAKTE_FIELDS.iban] as string) ?? null,
    created_at: r.createdTime ?? null
  };
}

export function mapTimelineEntry(r: TeableRecord) {
  const f = r.fields as Record<string, unknown>;
  const typ = f[INTERAKTIONEN_FIELDS.typ] as string;
  const isEmail = typ === 'email_rein' || typ === 'email_raus';
  return {
    contact_id: linkId(f[INTERAKTIONEN_FIELDS.kontakt]) as string,
    art: isEmail ? ('email' as const) : ('interaction' as const),
    eintrag_id: r.id,
    subtyp: isEmail ? (typ === 'email_rein' ? 'rein' : 'raus') : typ,
    datum: f[INTERAKTIONEN_FIELDS.datum] as string,
    titel: (f[INTERAKTIONEN_FIELDS.titel] as string) ?? null,
    inhalt: (f[INTERAKTIONEN_FIELDS.text] as string) ?? null
  };
}

export function mapAction(r: TeableRecord, contactName: string | null = null) {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id,
    contact_id: linkId(f[AUFGABEN_FIELDS.kontakt]),
    contact_name: contactName,
    titel: f[AUFGABEN_FIELDS.titel] as string,
    status: f[AUFGABEN_FIELDS.status] as 'offen' | 'erledigt',
    faellig_am: (f[AUFGABEN_FIELDS.faelligAm] as string) ?? null,
    notizen: (f[AUFGABEN_FIELDS.notizen] as string) ?? null,
    created_at: r.createdTime ?? null
  };
}

export function mapProspect(r: TeableRecord, companyName: string | null = null) {
  const f = r.fields as Record<string, unknown>;
  return {
    id: r.id,
    name: f[PROSPECT_FIELDS.name] as string,
    vorname: (f[PROSPECT_FIELDS.vorname] as string) ?? null,
    nachname: (f[PROSPECT_FIELDS.nachname] as string) ?? null,
    titel: (f[PROSPECT_FIELDS.titel] as string) ?? null,
    anrede: (f[PROSPECT_FIELDS.anrede] as 'Herr' | 'Frau' | null) ?? null,
    email: (f[PROSPECT_FIELDS.email] as string) ?? null,
    firma: (f[PROSPECT_FIELDS.firmaText] as string) ?? null,
    company_id: linkId(f[PROSPECT_FIELDS.firma]),
    company_name: companyName,
    rolle: (f[PROSPECT_FIELDS.rolle] as string) ?? null,
    telefon: (f[PROSPECT_FIELDS.telefon] as string) ?? null,
    website: (f[PROSPECT_FIELDS.website] as string) ?? null,
    notizen: (f[PROSPECT_FIELDS.notizen] as string) ?? null,
    status: f[PROSPECT_FIELDS.status] as string,
    kanal: (f[PROSPECT_FIELDS.kanal] as string) ?? null,
    versandt_am: (f[PROSPECT_FIELDS.versandtAm] as string) ?? null,
    followup_am: (f[PROSPECT_FIELDS.followupAm] as string) ?? null,
    sperre: Boolean(f[PROSPECT_FIELDS.sperre]),
    sperre_grund: (f[PROSPECT_FIELDS.sperreGrund] as string) ?? null,
    created_at: r.createdTime ?? null
  };
}

export function mapFile(att: Attachment) {
  return {
    id: att.id,
    filename: att.name,
    mimetype: att.mimetype ?? att.mimeType ?? 'application/octet-stream',
    data: att.url,
    created_at: att.timestamp ?? null
  };
}
