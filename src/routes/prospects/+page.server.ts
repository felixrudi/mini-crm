import { sql } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const status = url.searchParams.get('status') || '';
  const q = url.searchParams.get('q') || '';

  let prospects;
  if (status && q) {
    prospects = await sql`SELECT p.*, co.name as company_name FROM prospects p LEFT JOIN companies co ON p.company_id = co.id WHERE p.status = ${status} AND (p.name ILIKE ${'%' + q + '%'} OR p.email ILIKE ${'%' + q + '%'} OR p.firma ILIKE ${'%' + q + '%'}) ORDER BY p.versandt_am DESC NULLS LAST, p.created_at DESC`;
  } else if (status) {
    prospects = await sql`SELECT p.*, co.name as company_name FROM prospects p LEFT JOIN companies co ON p.company_id = co.id WHERE p.status = ${status} ORDER BY p.versandt_am DESC NULLS LAST, p.created_at DESC`;
  } else if (q) {
    prospects = await sql`SELECT p.*, co.name as company_name FROM prospects p LEFT JOIN companies co ON p.company_id = co.id WHERE p.name ILIKE ${'%' + q + '%'} OR p.email ILIKE ${'%' + q + '%'} OR p.firma ILIKE ${'%' + q + '%'} ORDER BY p.versandt_am DESC NULLS LAST, p.created_at DESC`;
  } else {
    prospects = await sql`SELECT p.*, co.name as company_name FROM prospects p LEFT JOIN companies co ON p.company_id = co.id ORDER BY p.versandt_am DESC NULLS LAST, p.created_at DESC`;
  }

  const counts = await sql`SELECT status, count(*)::int FROM prospects GROUP BY status`;
  const total = await sql`SELECT count(*)::int as n FROM prospects`;
  const companies = await sql`SELECT id, name FROM companies ORDER BY name`;

  return { prospects, counts, total: total[0]?.n ?? 0, status, q, companies };
};

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const name = (d.get('name') as string)?.trim();
    if (!name) return fail(400, { error: 'Name fehlt' });
    await sql`INSERT INTO prospects
      (name, vorname, nachname, titel, anrede, email, firma, company_id, rolle, telefon, website, notizen, status, kanal, versandt_am, followup_am)
      VALUES (
        ${name},
        ${d.get('vorname') || null}, ${d.get('nachname') || null},
        ${d.get('titel') || null}, ${d.get('anrede') || null},
        ${d.get('email') || null}, ${d.get('firma') || null},
        ${d.get('company_id') || null},
        ${d.get('rolle') || null}, ${d.get('telefon') || null},
        ${d.get('website') || null}, ${d.get('notizen') || null},
        ${(d.get('status') as string) || 'gesendet'},
        ${d.get('kanal') || 'email'},
        ${d.get('versandt_am') || null}, ${d.get('followup_am') || null}
      )`;
    return { success: true };
  },

  update_status: async ({ request }) => {
    const d = await request.formData();
    await sql`UPDATE prospects SET status = ${d.get('status') as string} WHERE id = ${d.get('id') as string}`;
    return { success: true };
  },

  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const name = (d.get('name') as string)?.trim() || 'Unbekannt';
    await sql`UPDATE prospects SET
      name=${name}, vorname=${d.get('vorname')||null}, nachname=${d.get('nachname')||null},
      titel=${d.get('titel')||null}, anrede=${d.get('anrede')||null},
      email=${d.get('email')||null}, firma=${d.get('firma')||null},
      company_id=${d.get('company_id')||null},
      rolle=${d.get('rolle')||null}, telefon=${d.get('telefon')||null},
      website=${d.get('website')||null}, notizen=${d.get('notizen')||null},
      status=${(d.get('status') as string)||'gesendet'}, kanal=${d.get('kanal')||'email'},
      versandt_am=${d.get('versandt_am')||null}, followup_am=${d.get('followup_am')||null}
      WHERE id=${id}`;
    return { success: true };
  },

  promote: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const rows = await sql`SELECT * FROM prospects WHERE id = ${id}`;
    const p = rows[0];
    if (!p) return fail(404, { error: 'Nicht gefunden' });

    // Firma: direkte company_id nutzen, oder per Name suchen/anlegen
    let company_id: string | null = p.company_id ?? null;
    if (!company_id && p.firma) {
      const existing = await sql`SELECT id FROM companies WHERE name ILIKE ${p.firma} LIMIT 1`;
      if (existing.length > 0) {
        company_id = existing[0].id;
      } else {
        const newCo = await sql`INSERT INTO companies (name, website) VALUES (${p.firma}, ${p.website || null}) RETURNING id`;
        company_id = newCo[0].id;
      }
    }

    const result = await sql`INSERT INTO contacts
      (name, vorname, nachname, titel, anrede, email, company_id, rolle, telefon, notizen)
      VALUES (${p.name}, ${p.vorname}, ${p.nachname}, ${p.titel}, ${p.anrede},
              ${p.email}, ${company_id}, ${p.rolle}, ${p.telefon}, ${p.notizen})
      RETURNING id`;

    await sql`DELETE FROM prospects WHERE id = ${id}`;
    return { success: true, contact_id: result[0]?.id };
  },

  delete: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM prospects WHERE id = ${d.get('id') as string}`;
    return { success: true };
  },

  import_csv: async ({ request }) => {
    const d = await request.formData();
    const rows = JSON.parse(d.get('rows') as string) as Record<string, string>[];
    if (!rows?.length) return fail(400, { error: 'Keine Daten' });

    for (const row of rows) {
      const name = (row.name || [row.vorname, row.nachname].filter(Boolean).join(' ') || row.Name || '').trim();
      if (!name) continue;
      await sql`INSERT INTO prospects
        (name, vorname, nachname, titel, anrede, email, firma, rolle, telefon, website, status, versandt_am)
        VALUES (
          ${name},
          ${row.vorname || row.Vorname || null},
          ${row.nachname || row.Nachname || null},
          ${row.titel || row.Titel || null},
          ${row.anrede || row.Anrede || null},
          ${row.email || row.Email || row['E-Mail'] || null},
          ${row.firma || row.Firma || row.kanzlei || row.Kanzlei || null},
          ${row.rolle || row.Rolle || row.position || null},
          ${row.telefon || row.Telefon || row.phone || null},
          ${row.website || row.Website || null},
          'gesendet',
          ${row.versandt_am || row.datum || null}
        )
        ON CONFLICT DO NOTHING`;
    }
    return { success: true, count: rows.length };
  }
};
