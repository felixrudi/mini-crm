import { listRecords, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS, INTERAKTIONEN_FIELDS, OUTREACH_FIELDS } from '$lib/server/teable-schema';
import { mapContact } from '$lib/server/teable-map';
import type { PageServerLoad } from './$types';

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

export const load: PageServerLoad = async () => {
  const [kontakteRecs, firmenRecs, interaktionenRecs, outreachRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen),
    listRecords(TABLES.interaktionenReal),
    listRecords(TABLES.outreach)
  ]);

  const kontaktNameById = new Map(kontakteRecs.map((k) => [k.id, k.fields[KONTAKTE_FIELDS.name] as string]));
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name] as string]));

  const lastActivityByContact = new Map<string, string>();
  for (const i of interaktionenRecs) {
    const cid = linkId(i.fields[INTERAKTIONEN_FIELDS.kontakt]);
    const datum = i.fields[INTERAKTIONEN_FIELDS.datum] as string;
    if (!cid || !datum) continue;
    const cur = lastActivityByContact.get(cid);
    if (!cur || datum > cur) lastActivityByContact.set(cid, datum);
  }

  const recent_contacts = kontakteRecs
    .map((c) => ({
      ...mapContact(c, firmaNameById.get(linkId(c.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null),
      last_activity: lastActivityByContact.get(c.id) ?? null
    }))
    .sort((a, b) => {
      if (!a.last_activity) return 1;
      if (!b.last_activity) return -1;
      return b.last_activity.localeCompare(a.last_activity);
    })
    .slice(0, 8);

  const stats = {
    contacts: kontakteRecs.length,
    companies: firmenRecs.length
  };

  const allTags = [...new Set(kontakteRecs.flatMap((r) => (r.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []))].sort();

  // --- Outreach-KPIs: gesendet / beantwortet / Rücklaufquote, Woche vs. Monat ---
  const weekCutoff = daysAgo(7);
  const monthCutoff = daysAgo(30);

  const sentWeek = outreachRecs.filter((r) => {
    const d = r.fields[OUTREACH_FIELDS.versandtAm] as string | undefined;
    return d && d >= weekCutoff;
  });
  const sentMonth = outreachRecs.filter((r) => {
    const d = r.fields[OUTREACH_FIELDS.versandtAm] as string | undefined;
    return d && d >= monthCutoff;
  });
  const answeredWeek = sentWeek.filter((r) => !!r.fields[OUTREACH_FIELDS.antwortKurzfassung]);
  const answeredMonth = sentMonth.filter((r) => !!r.fields[OUTREACH_FIELDS.antwortKurzfassung]);

  const outreachStats = {
    outreachWoche: sentWeek.length,
    outreachMonat: sentMonth.length,
    antwortenWoche: answeredWeek.length,
    antwortenMonat: answeredMonth.length,
    rücklaufWoche: sentWeek.length ? Math.round((answeredWeek.length / sentWeek.length) * 100) : 0,
    rücklaufMonat: sentMonth.length ? Math.round((answeredMonth.length / sentMonth.length) * 100) : 0
  };

  // --- Antwort-Wiedervorlagen: beantwortet, aber noch kein Follow-up raus ---
  // Outreach.Kontakt verlinkt auf Kontakte_Scraper (nicht kontakteReal) — daher
  // den Namen aus dem Link-Titel nehmen, wie es outreach/+page.server.ts auch tut.
  const wiedervorlagen = outreachRecs
    .filter(
      (r) =>
        !!r.fields[OUTREACH_FIELDS.antwortKurzfassung] &&
        !r.fields[OUTREACH_FIELDS.followUpGesendet]
    )
    .map((r) => ({
      id: r.id,
      name: (r.fields[OUTREACH_FIELDS.kontakt] as any)?.title ?? 'Unbekannt',
      antwort: r.fields[OUTREACH_FIELDS.antwortKurzfassung] as string,
      followUpFaellig: r.fields[OUTREACH_FIELDS.followUpFaellig] as string | undefined
    }))
    .sort((a, b) => {
      if (!a.followUpFaellig) return 1;
      if (!b.followUpFaellig) return -1;
      return a.followUpFaellig.localeCompare(b.followUpFaellig);
    })
    .slice(0, 5);

  return { recent_contacts, stats, allTags, outreachStats, wiedervorlagen };
};
