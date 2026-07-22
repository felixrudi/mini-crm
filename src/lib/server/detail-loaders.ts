// Shared detail loaders for full pages + panel API.
import { getRecord, listRecords, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import { mapContact, mapCompany, mapTimelineEntry } from '$lib/server/teable-map';

export async function loadContactDetail(id: string) {
  const contact = await getRecord(TABLES.kontakteReal, id);
  if (!contact) return null;

  const [firma, allInteractions, firmenRecs] = await Promise.all([
    linkId(contact.fields[KONTAKTE_FIELDS.firma])
      ? getRecord(TABLES.firmen, linkId(contact.fields[KONTAKTE_FIELDS.firma])!)
      : Promise.resolve(null),
    listRecords(TABLES.interaktionenReal),
    listRecords(TABLES.firmen)
  ]);

  const timeline = allInteractions
    .filter((r) => linkId(r.fields[INTERAKTIONEN_FIELDS.kontakt]) === id)
    .map(mapTimelineEntry)
    .sort((a, b) => b.datum.localeCompare(a.datum));

  const companies = firmenRecs
    .map((f) => ({ id: f.id, name: f.fields[FIRMEN_FIELDS.name] as string }))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  return {
    contact: mapContact(contact, (firma?.fields[FIRMEN_FIELDS.name] as string) ?? null),
    timeline,
    companies
  };
}

export async function loadCompanyDetail(id: string) {
  const company = await getRecord(TABLES.firmen, id);
  if (!company) return null;

  const [allContacts, allInteractions] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.interaktionenReal)
  ]);

  const contacts = allContacts
    .filter((c) => linkId(c.fields[KONTAKTE_FIELDS.firma]) === id)
    .map((c) => mapContact(c))
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  const timeline = allInteractions
    .filter((r) => linkId(r.fields[INTERAKTIONEN_FIELDS.firma]) === id)
    .map(mapTimelineEntry)
    .sort((a, b) => b.datum.localeCompare(a.datum));

  return {
    company: mapCompany(company),
    contacts,
    timeline
  };
}
