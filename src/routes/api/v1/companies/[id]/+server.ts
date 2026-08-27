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

  // Body keys follow the same lowercase contract as POST's request body
  // (website, telefon, strasse, ...), not Teable's capitalized field names —
  // so each field is picked explicitly rather than blindly spread-merged with
  // existing.fields (which IS keyed by Teable field names). A blind
  // `{...existing.fields, ...body}` merge would silently never apply any
  // update, since body's keys never collide with existing.fields' keys.
  const pick = (key: string, fieldKey: string): string | null =>
    body[key] !== undefined ? ((body[key] as string) || null) : ((existing.fields[fieldKey] as string) ?? null);

  const pickTags = (): string[] =>
    body.tags !== undefined ? (body.tags as string[]) : ((existing.fields[FIRMEN_FIELDS.tags] as string[]) ?? []);

  await updateRecord(TABLES.firmen, params.id, {
    [FIRMEN_FIELDS.name]: (body.name !== undefined ? (body.name as string)?.trim() : undefined) || existing.fields[FIRMEN_FIELDS.name],
    [FIRMEN_FIELDS.website]: pick('website', FIRMEN_FIELDS.website),
    [FIRMEN_FIELDS.telefon]: pick('telefon', FIRMEN_FIELDS.telefon),
    [FIRMEN_FIELDS.strasse]: pick('strasse', FIRMEN_FIELDS.strasse),
    [FIRMEN_FIELDS.plz]: pick('plz', FIRMEN_FIELDS.plz),
    [FIRMEN_FIELDS.ort]: pick('ort', FIRMEN_FIELDS.ort),
    [FIRMEN_FIELDS.land]: pick('land', FIRMEN_FIELDS.land),
    [FIRMEN_FIELDS.notizen]: pick('notizen', FIRMEN_FIELDS.notizen),
    [FIRMEN_FIELDS.tags]: pickTags()
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
