import { sql } from '$lib/db';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// GET /api/v1/contacts/:id
export const GET: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const [contact] = await sql`
    SELECT c.*, co.name as company_name FROM contacts c
    LEFT JOIN companies co ON c.company_id = co.id
    WHERE c.id = ${params.id}`;

  if (!contact) return jsonError('Not found', 404);
  return jsonOk({ contact });
};

// PATCH /api/v1/contacts/:id
export const PATCH: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const [existing] = await sql`SELECT * FROM contacts WHERE id = ${params.id}`;
  if (!existing) return jsonError('Not found', 404);

  const tags = body.tags !== undefined
    ? Array.isArray(body.tags)
      ? (body.tags as string[]).map(t => t.trim().toLowerCase()).filter(Boolean)
      : typeof body.tags === 'string'
        ? (body.tags as string).split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        : existing.tags
    : existing.tags;

  const merged = { ...existing, ...body, tags };

  await sql`
    UPDATE contacts SET
      company_id = ${(merged.company_id as string) || null},
      name       = ${(merged.name as string) || 'Unbekannt'},
      vorname    = ${(merged.vorname as string) || null},
      nachname   = ${(merged.nachname as string) || null},
      titel      = ${(merged.titel as string) || null},
      anrede     = ${(merged.anrede as string) || null},
      strasse    = ${(merged.strasse as string) || null},
      plz        = ${(merged.plz as string) || null},
      ort        = ${(merged.ort as string) || null},
      geburtstag = ${(merged.geburtstag as string) || null},
      email      = ${(merged.email as string) || null},
      telefon    = ${(merged.telefon as string) || null},
      telefon2   = ${(merged.telefon2 as string) || null},
      whatsapp   = ${(merged.whatsapp as string) || null},
      wechat_id  = ${(merged.wechat_id as string) || null},
      linkedin_url = ${(merged.linkedin_url as string) || null},
      rolle      = ${(merged.rolle as string) || null},
      notizen    = ${(merged.notizen as string) || null},
      iban       = ${(merged.iban as string) || null},
      tags       = ${tags}
    WHERE id = ${params.id}`;

  const [updated] = await sql`SELECT * FROM contacts WHERE id = ${params.id}`;
  return jsonOk({ contact: updated });
};

// DELETE /api/v1/contacts/:id
export const DELETE: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const [existing] = await sql`SELECT id FROM contacts WHERE id = ${params.id}`;
  if (!existing) return jsonError('Not found', 404);

  await sql`DELETE FROM contacts WHERE id = ${params.id}`;
  return jsonOk({ deleted: true });
};
