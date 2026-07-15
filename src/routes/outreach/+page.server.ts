import { listRecords, linkId } from '$lib/server/teable';
import type { PageServerLoad } from './$types';

const TABLES = {
  outreach: 'tblLHWeNN9dq1ObUE0D',
  kontakteScraper: 'tbltBCdkAvxz1R95ErY'
};

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';

  // Fetch both Outreach and Kontakte_Scraper tables
  const [outreachRecords, scraperRecords] = await Promise.all([
    listRecords(TABLES.outreach),
    listRecords(TABLES.kontakteScraper)
  ]);

  const scraperMap = new Map(scraperRecords.map(r => [r.id, r.fields]));

  let items = outreachRecords.map(r => {
    const kontaktId = linkId(r.fields.Kontakt);
    const scraper = kontaktId ? scraperMap.get(kontaktId) : null;
    
    return {
      id: r.id,
      nr: r.fields.Nr as number | undefined,
      kontaktName: r.fields.Kontakt?.title ?? 'Unbekannt',
      kanzlei: (scraper?.Kanzlei || '') as string,
      email: (scraper?.Email || '—') as string,
      status: (r.fields.Status || 'recherche') as string,
      versandtAm: r.fields['Versandt am'] as string | undefined,
      gesendetUeber: r.fields['Gesendet über'] as string | undefined,
      kanal: r.fields.Kanal as string | undefined,
      followUpFaellig: r.fields['Follow-up fällig'] as string | undefined,
      followUpGesendet: !!r.fields['Follow-up gesendet'],
      antwortKurzfassung: r.fields['Antwort (Kurzfassung)'] as string | undefined,
      notiz: (r.fields.Notiz || r.fields.Verlauf || '') as string
    };
  });

  // Filter by search query if present
  if (q.trim()) {
    const search = q.toLowerCase();
    items = items.filter(item => 
      item.kontaktName.toLowerCase().includes(search) || 
      item.kanzlei.toLowerCase().includes(search) ||
      item.email.toLowerCase().includes(search)
    );
  }

  return {
    outreach: items,
    q
  };
};