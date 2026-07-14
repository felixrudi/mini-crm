import { getRecord, updateRecord, deleteRecord } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const company = await getRecord(TABLES.firmen, params.id);
  if (!company) return jsonError('Not found', 404);
  return jsonOk({ company: { id: company.id, ...company.fields } });
};

export const PATCH: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const existing = await getRecord(TABLES.firmen, params.id);
  if (!existing) return jsonError('Not found', 404);

  const merged = { ...existing.fields, ...body };
  await updateRecord(TABLES.firmen, params.id, {
    [FIRMEN_FIELDS.name]: (merged[FIRMEN_FIELDS.name] as string)?.trim ? (merged[FIRMEN_FIELDS.name] as string).trim() : existing.fields[FIRMEN_FIELDS.name],
    [FIRMEN_FIELDS.website]: merged[FIRMEN_FIELDS.website] || null,
    [FIRMEN_FIELDS.strasse]: merged[FIRMEN_FIELDS.strasse] || null,
    [FIRMEN_FIELDS.plz]: merged[FIRMEN_FIELDS.plz] || null,
    [FIRMEN_FIELDS.ort]: merged[FIRMEN_FIELDS.ort] || null,
    [FIRMEN_FIELDS.land]: merged[FIRMEN_FIELDS.land] || null,
    [FIRMEN_FIELDS.notizen]: merged[FIRMEN_FIELDS.notizen] || null
  });

  const updated = await getRecord(TABLES.firmen, params.id);
  return jsonOk({ company: { id: updated!.id, ...updated!.fields } });
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const existing = await getRecord(TABLES.firmen, params.id);
  if (!existing) return jsonError('Not found', 404);

  await deleteRecord(TABLES.firmen, params.id);
  return jsonOk({ deleted: true });
};
