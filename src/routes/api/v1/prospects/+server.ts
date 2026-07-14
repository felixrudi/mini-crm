import { createRecord } from '$lib/server/teable';
import { TABLES, PROSPECT_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// POST /api/v1/prospects — used by Henry's push-to-CRM automation (plan Task 12)
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON', 400);
  }

  const name = (body.name as string) || [body.titel, body.vorname, body.nachname].filter(Boolean).join(' ') || null;
  if (!name) return jsonError('name (or vorname/nachname) is required', 400);

  const rec = await createRecord(TABLES.prospects, {
    [PROSPECT_FIELDS.name]: name,
    [PROSPECT_FIELDS.vorname]: (body.vorname as string) || null,
    [PROSPECT_FIELDS.nachname]: (body.nachname as string) || null,
    [PROSPECT_FIELDS.titel]: (body.titel as string) || null,
    [PROSPECT_FIELDS.anrede]: (body.anrede as string) || null,
    [PROSPECT_FIELDS.email]: (body.email as string) || null,
    [PROSPECT_FIELDS.firmaText]: (body.firma as string) || null,
    [PROSPECT_FIELDS.rolle]: (body.rolle as string) || null,
    [PROSPECT_FIELDS.telefon]: (body.telefon as string) || null,
    [PROSPECT_FIELDS.website]: (body.website as string) || null,
    [PROSPECT_FIELDS.notizen]: (body.notizen as string) || null,
    [PROSPECT_FIELDS.status]: (body.status as string) || null,
    [PROSPECT_FIELDS.kanal]: (body.kanal as string) || null,
    [PROSPECT_FIELDS.versandtAm]: (body.versandt_am as string) || null,
    [PROSPECT_FIELDS.followupAm]: (body.followup_am as string) || null,
    [PROSPECT_FIELDS.sperre]: body.sperre != null ? Boolean(body.sperre) : null,
    [PROSPECT_FIELDS.sperreGrund]: (body.sperre_grund as string) || null,
    [PROSPECT_FIELDS.herkunft]: (body.herkunft as string) || 'mass-outreach'
  });

  return jsonOk({ prospect: { id: rec.id, ...rec.fields } }, 201);
};
