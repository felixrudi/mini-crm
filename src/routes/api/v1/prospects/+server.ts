import { sql } from '$lib/db';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// POST /api/v1/prospects
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  // Build name from parts if not provided
  const name =
    (body.name as string) ||
    [body.titel, body.vorname, body.nachname].filter(Boolean).join(' ') ||
    null;

  if (!name) {
    return jsonError('name (or vorname/nachname) is required', 400);
  }

  const [row] = await sql`
    INSERT INTO prospects
      (name, vorname, nachname, titel, anrede, email, firma, company_id, rolle,
       telefon, website, notizen, status, kanal, versandt_am, followup_am,
       sperre, sperre_grund)
    VALUES (
      ${name},
      ${(body.vorname as string) || null},
      ${(body.nachname as string) || null},
      ${(body.titel as string) || null},
      ${(body.anrede as string) || null},
      ${(body.email as string) || null},
      ${(body.firma as string) || null},
      ${(body.company_id as string) || null},
      ${(body.rolle as string) || null},
      ${(body.telefon as string) || null},
      ${(body.website as string) || null},
      ${(body.notizen as string) || null},
      ${(body.status as string) || null},
      ${(body.kanal as string) || null},
      ${(body.versandt_am as string) || null},
      ${(body.followup_am as string) || null},
      ${body.sperre != null ? Boolean(body.sperre) : null},
      ${(body.sperre_grund as string) || null}
    )
    RETURNING *`;

  return jsonOk({ prospect: row }, 201);
};
