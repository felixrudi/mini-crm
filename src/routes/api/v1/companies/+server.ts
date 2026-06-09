import { sql } from '$lib/db';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// GET /api/v1/companies?q=...
export const GET: RequestHandler = async ({ request, url }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const q = url.searchParams.get('q') || '';

  const companies = q
    ? await sql`SELECT * FROM companies WHERE name ILIKE ${'%' + q + '%'} ORDER BY name LIMIT 50`
    : await sql`SELECT * FROM companies ORDER BY name LIMIT 200`;

  return jsonOk({ companies });
};

// POST /api/v1/companies
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const name = (body.name as string)?.trim();
  if (!name) return jsonError('name is required');

  const [existing] = await sql`SELECT id FROM companies WHERE name ILIKE ${name}`;
  if (existing) return jsonOk({ company: existing, created: false });

  const [row] = await sql`
    INSERT INTO companies (name, website, strasse, plz, ort, land, notizen)
    VALUES (
      ${name},
      ${(body.website as string) || null},
      ${(body.strasse as string) || null},
      ${(body.plz as string) || null},
      ${(body.ort as string) || null},
      ${(body.land as string) || null},
      ${(body.notizen as string) || null}
    )
    RETURNING *`;

  return jsonOk({ company: row, created: true }, 201);
};
