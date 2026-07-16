import { listRecords, linkId } from '$lib/server/teable';
import type { PageServerLoad } from './$types';

const TABLES = {
  outreach: 'tblLHWeNN9dq1ObUE0D',
  kontakteScraper: 'tbltBCdkAvxz1R95ErY',
  abgleichSnapshot: 'tblOoATl5PkB4v84q6R'
};

type FreigabeEintrag = {
  email: string;
  kontakt: string;
  kontakt_id: string;
  outreach_id: string | null;
  teable_status: string | null;
  grund: string;
};

export const load: PageServerLoad = async () => {
  const [outreachRecords, scraperRecords, snapshotRecords] = await Promise.all([
    listRecords(TABLES.outreach),
    listRecords(TABLES.kontakteScraper),
    listRecords<{
      Zeitstempel?: string;
      'Gestempelt gesamt'?: number;
      'Freigabe offen'?: number;
      'Freigabe-Liste'?: string;
    }>(TABLES.abgleichSnapshot)
  ]);

  const scraperMap = new Map(scraperRecords.map((r) => [r.id, r.fields]));

  // Neuester Snapshot = höchster Zeitstempel (Tabelle wird nur angehängt, nie sortiert geliefert).
  const snapshots = snapshotRecords
    .filter((r) => r.fields.Zeitstempel)
    .sort((a, b) => new Date(b.fields.Zeitstempel!).getTime() - new Date(a.fields.Zeitstempel!).getTime());
  const latestSnapshot = snapshots[0] ?? null;

  let freigabeListe: FreigabeEintrag[] = [];
  if (latestSnapshot?.fields['Freigabe-Liste']) {
    try {
      freigabeListe = JSON.parse(latestSnapshot.fields['Freigabe-Liste']);
    } catch {
      freigabeListe = [];
    }
  }
  const freigabeByOutreachId = new Map(freigabeListe.filter((f) => f.outreach_id).map((f) => [f.outreach_id, f]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = outreachRecords.map((r) => {
    const kontaktId = linkId(r.fields.Kontakt);
    const scraper = kontaktId ? scraperMap.get(kontaktId) : null;
    const followUpFaellig = r.fields['Follow-up fällig'] as string | undefined;
    const followUpGesendet = !!r.fields['Follow-up gesendet'];
    let followUpUeberfaellig = false;
    if (followUpFaellig && !followUpGesendet) {
      const d = new Date(followUpFaellig);
      d.setHours(0, 0, 0, 0);
      followUpUeberfaellig = d <= today;
    }
    const freigabe = freigabeByOutreachId.get(r.id) ?? null;

    return {
      id: r.id,
      kontaktName: r.fields.Kontakt?.title ?? 'Unbekannt',
      kanzlei: (scraper?.Kanzlei || '') as string,
      email: (scraper?.Email || '—') as string,
      status: (r.fields.Status || 'recherche') as string,
      welle: r.fields.Welle as number | undefined,
      gesendetUeber: (r.fields['Gesendet über'] as string | undefined) ?? '',
      versandtAm: r.fields['Versandt am'] as string | undefined,
      followUpFaellig,
      followUpGesendet,
      followUpUeberfaellig,
      freigabeGrund: freigabe?.grund ?? null
    };
  });

  const freigabeFaellig = items.filter((i) => i.freigabeGrund);
  const followUpUeberfaelligCount = items.filter((i) => i.followUpUeberfaellig).length;

  // Ampel: grün = nichts offen, gelb = 1-3 Freigabe-Fälle, rot = 4+ oder Snapshot > 36h alt.
  let ampel: 'gruen' | 'gelb' | 'rot' = 'gruen';
  const snapshotAlterStunden = latestSnapshot
    ? (Date.now() - new Date(latestSnapshot.fields.Zeitstempel!).getTime()) / 3_600_000
    : null;
  if (snapshotAlterStunden === null || snapshotAlterStunden > 36) {
    ampel = 'rot';
  } else if (freigabeFaellig.length >= 4) {
    ampel = 'rot';
  } else if (freigabeFaellig.length >= 1) {
    ampel = 'gelb';
  }

  return {
    outreach: items,
    freigabeFaellig,
    followUpUeberfaelligCount,
    snapshot: latestSnapshot
      ? {
          zeitstempel: latestSnapshot.fields.Zeitstempel,
          gestempeltGesamt: latestSnapshot.fields['Gestempelt gesamt'] ?? 0,
          freigabeOffen: latestSnapshot.fields['Freigabe offen'] ?? 0,
          alterStunden: snapshotAlterStunden
        }
      : null,
    ampel
  };
};
