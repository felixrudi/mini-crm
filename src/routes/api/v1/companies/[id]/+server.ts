import { sql } from '$lib/db';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// GET /api/v1/companies/:id
export const GET: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const [company] = await sql`SELECT * FROM companies WHERE id = ${params.id}`;
  if (!company) return jsonError('Not found', 404);
  return jsonOk({ company });
};

// PATCH /api/v1/companies/:id
export const PATCH: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const [existing] = await sql`SELECT * FROM companies WHERE id = ${params.id}`;
  if (!existing) return jsonError('Not found', 404);

  const merged = { ...existing, ...body };

  await sql`
    UPDATE companies SET
      name    = ${(merged.name as string)?.trim() || existing.name},
      website = ${(merged.website as string) || null},
      strasse = ${(merged.strasse as string) || null},
      plz     = ${(merged.plz as string) || null},
      ort     = ${(merged.ort as string) || null},
      land    = ${(merged.land as string) || null},
      notizen = ${(merged.notizen as string) || null}
    WHERE id = ${params.id}`;

  const [updated] = await sql`SELECT * FROM companies WHERE id = ${params.id}`;
  return jsonOk({ company: updated });
};

// DELETE /api/v1/companies/:id
export const DELETE: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const [existing] = await sql`SELECT id FROM companies WHERE id = ${params.id}`;
  if (!existing) return jsonError('Not found', 404);

  await sql`DELETE FROM companies WHERE id = ${params.id}`;
  return jsonOk({ deleted: true });
};
