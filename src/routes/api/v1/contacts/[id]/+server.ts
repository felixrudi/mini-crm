import { getRecord, updateRecord, deleteRecord } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  if (!contact) return jsonError('Not found', 404);
  return jsonOk({ contact: { id: contact.id, ...contact.fields } });
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

  const existing = await getRecord(TABLES.kontakteReal, params.id!);
  if (!existing) return jsonError('Not found', 404);

  const tags =
    body.tags !== undefined
      ? Array.isArray(body.tags)
        ? (body.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean)
        : typeof body.tags === 'string'
          ? (body.tags as string).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
          : ((existing.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? [])
      : ((existing.fields[KONTAKTE_FIELDS.tags] as string[] | undefined) ?? []);

  // Body keys follow the same lowercase/snake_case contract as POST's request
  // body (vorname, nachname, telefon, ...), not Teable's capitalized field
  // names — so each field is picked explicitly rather than blindly spread-
  // merged with existing.fields (which IS keyed by Teable field names). A
  // blind `{...existing.fields, ...body}` merge would silently never apply
  // any update, since body's keys never collide with existing.fields' keys.
  const pick = <T>(key: string, fieldKey: string): T | null =>
    body[key] !== undefined ? ((body[key] as T) ?? null) : ((existing.fields[fieldKey] as T) ?? null);

  await updateRecord(TABLES.kontakteReal, params.id!, {
    [KONTAKTE_FIELDS.firma]:
      body.company_id !== undefined
        ? body.company_id
          ? [{ id: body.company_id as string }]
          : null
        : existing.fields[KONTAKTE_FIELDS.firma],
    [KONTAKTE_FIELDS.name]: pick<string>('name', KONTAKTE_FIELDS.name) || 'Unbekannt',
    [KONTAKTE_FIELDS.vorname]: pick('vorname', KONTAKTE_FIELDS.vorname),
    [KONTAKTE_FIELDS.nachname]: pick('nachname', KONTAKTE_FIELDS.nachname),
    [KONTAKTE_FIELDS.titel]: pick('titel', KONTAKTE_FIELDS.titel),
    [KONTAKTE_FIELDS.anrede]: pick('anrede', KONTAKTE_FIELDS.anrede),
    [KONTAKTE_FIELDS.strasse]: pick('strasse', KONTAKTE_FIELDS.strasse),
    [KONTAKTE_FIELDS.plz]: pick('plz', KONTAKTE_FIELDS.plz),
    [KONTAKTE_FIELDS.ort]: pick('ort', KONTAKTE_FIELDS.ort),
    [KONTAKTE_FIELDS.geburtstag]: pick('geburtstag', KONTAKTE_FIELDS.geburtstag),
    [KONTAKTE_FIELDS.email]: pick('email', KONTAKTE_FIELDS.email),
    [KONTAKTE_FIELDS.telefon]: pick('telefon', KONTAKTE_FIELDS.telefon),
    [KONTAKTE_FIELDS.telefon2]: pick('telefon2', KONTAKTE_FIELDS.telefon2),
    [KONTAKTE_FIELDS.whatsapp]: pick('whatsapp', KONTAKTE_FIELDS.whatsapp),
    [KONTAKTE_FIELDS.wechatId]: pick('wechat_id', KONTAKTE_FIELDS.wechatId),
    [KONTAKTE_FIELDS.linkedinUrl]: pick('linkedin_url', KONTAKTE_FIELDS.linkedinUrl),
    [KONTAKTE_FIELDS.rolle]: pick('rolle', KONTAKTE_FIELDS.rolle),
    [KONTAKTE_FIELDS.notizen]: pick('notizen', KONTAKTE_FIELDS.notizen),
    [KONTAKTE_FIELDS.iban]: pick('iban', KONTAKTE_FIELDS.iban),
    [KONTAKTE_FIELDS.tags]: tags
  });

  const updated = await getRecord(TABLES.kontakteReal, params.id!);
  return jsonOk({ contact: { id: updated!.id, ...updated!.fields } });
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const existing = await getRecord(TABLES.kontakteReal, params.id!);
  if (!existing) return jsonError('Not found', 404);

  await deleteRecord(TABLES.kontakteReal, params.id!);
  return jsonOk({ deleted: true });
};
