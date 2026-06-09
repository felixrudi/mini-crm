import { sql } from '$lib/db';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// GET /api/v1/contacts?q=...&tag=...&exclude_tag=...&limit=50
export const GET: RequestHandler = async ({ request, url }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const q = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';
  const excludeTag = url.searchParams.get('exclude_tag') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

  let contacts;
  if (q && tag && excludeTag) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'})
        AND ${tag} = ANY(c.tags)
        AND NOT (${excludeTag} = ANY(COALESCE(c.tags, '{}'::text[])))
      ORDER BY c.name LIMIT ${limit}`;
  } else if (q && tag) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'})
        AND ${tag} = ANY(c.tags)
      ORDER BY c.name LIMIT ${limit}`;
  } else if (q && excludeTag) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'})
        AND NOT (${excludeTag} = ANY(COALESCE(c.tags, '{}'::text[])))
      ORDER BY c.name LIMIT ${limit}`;
  } else if (q) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}
      ORDER BY c.name LIMIT ${limit}`;
  } else if (tag && excludeTag) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE ${tag} = ANY(c.tags)
        AND NOT (${excludeTag} = ANY(COALESCE(c.tags, '{}'::text[])))
      ORDER BY c.name LIMIT ${limit}`;
  } else if (tag) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE ${tag} = ANY(c.tags)
      ORDER BY c.name LIMIT ${limit}`;
  } else if (excludeTag) {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      WHERE NOT (${excludeTag} = ANY(COALESCE(c.tags, '{}'::text[])))
      ORDER BY c.name LIMIT ${limit}`;
  } else {
    contacts = await sql`
      SELECT c.*, co.name as company_name FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      ORDER BY c.name LIMIT ${limit}`;
  }

  return jsonOk({ contacts });
};

// POST /api/v1/contacts
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const name = (body.name as string)?.trim() || [body.vorname, body.nachname].filter(Boolean).join(' ') || 'Unbekannt';
  const tags = Array.isArray(body.tags)
    ? (body.tags as string[]).map(t => t.trim().toLowerCase()).filter(Boolean)
    : typeof body.tags === 'string'
      ? (body.tags as string).split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      : [];

  const [row] = await sql`
    INSERT INTO contacts
      (company_id, name, vorname, nachname, titel, anrede, strasse, plz, ort, geburtstag,
       email, telefon, telefon2, whatsapp, wechat_id, linkedin_url, rolle, notizen, iban, tags)
    VALUES (
      ${(body.company_id as string) || null},
      ${name},
      ${(body.vorname as string) || null},
      ${(body.nachname as string) || null},
      ${(body.titel as string) || null},
      ${(body.anrede as string) || null},
      ${(body.strasse as string) || null},
      ${(body.plz as string) || null},
      ${(body.ort as string) || null},
      ${(body.geburtstag as string) || null},
      ${(body.email as string) || null},
      ${(body.telefon as string) || null},
      ${(body.telefon2 as string) || null},
      ${(body.whatsapp as string) || null},
      ${(body.wechat_id as string) || null},
      ${(body.linkedin_url as string) || null},
      ${(body.rolle as string) || null},
      ${(body.notizen as string) || null},
      ${(body.iban as string) || null},
      ${tags}
    )
    RETURNING *`;

  return jsonOk({ contact: row }, 201);
};
