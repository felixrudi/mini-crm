import { createRecord, link } from '$lib/server/teable';
import { TABLES, INTERAKTIONEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import { isRecordId } from '$lib/server/validation';
import type { RequestHandler } from './$types';

// POST /api/v1/interactions
// Body: { contact_id: string, typ?: string, titel?: string, text?: string, datum?: string }
export const POST: RequestHandler = async ({ request }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const contactId = body.contact_id;
  if (!isRecordId(contactId)) return jsonError('contact_id is required');

  const rec = await createRecord(TABLES.interaktionenReal, {
    [INTERAKTIONEN_FIELDS.kontakt]: link(contactId),
    [INTERAKTIONEN_FIELDS.typ]: (body.typ as string) || 'email_rein',
    [INTERAKTIONEN_FIELDS.datum]: (body.datum as string) || new Date().toISOString(),
    [INTERAKTIONEN_FIELDS.titel]: (body.titel as string) || null,
    [INTERAKTIONEN_FIELDS.text]: (body.text as string) || null
  });

  return jsonOk({ interaction: { id: rec.id, ...rec.fields } }, 201);
};
