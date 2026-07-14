import { listRecords, createRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

// GET /api/v1/contacts?q=...&tag=...&limit=50
export const GET: RequestHandler = async ({ request, url }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const q = (url.searchParams.get('q') || '').toLowerCase();
  const tag = url.searchParams.get('tag') || '';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);

  const [kontakteRecs, firmenRecs] = await Promise.all([
    listRecords(TABLES.kontakteReal),
    listRecords(TABLES.firmen)
  ]);
  const firmaNameById = new Map(firmenRecs.map((f) => [f.id, f.fields[FIRMEN_FIELDS.name]]));

  let filtered = kontakteRecs;
  if (q) {
    filtered = filtered.filter((r) => `${r.fields[KONTAKTE_FIELDS.name] ?? ''} ${r.fields[KONTAKTE_FIELDS.email] ?? ''}`.toLowerCase().includes(q));
  }
  if (tag) {
    filtered = filtered.filter((r) => ((r.fields[KONTAKTE_FIELDS.tags] as string[]) ?? []).includes(tag));
  }

  const contacts = filtered
    .slice(0, limit)
    .map((r): Record<string, unknown> => ({ id: r.id, ...r.fields, company_name: firmaNameById.get(linkId(r.fields[KONTAKTE_FIELDS.firma]) ?? '') ?? null }))
    .sort((a, b) => String(a[KONTAKTE_FIELDS.name]).localeCompare(String(b[KONTAKTE_FIELDS.name])));

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
    ? (body.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean)
    : typeof body.tags === 'string'
      ? (body.tags as string).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [];

  const rec = await createRecord(TABLES.kontakteReal, {
    [KONTAKTE_FIELDS.firma]: body.company_id ? [{ id: body.company_id as string }] : null,
    [KONTAKTE_FIELDS.name]: name,
    [KONTAKTE_FIELDS.vorname]: (body.vorname as string) || null,
    [KONTAKTE_FIELDS.nachname]: (body.nachname as string) || null,
    [KONTAKTE_FIELDS.titel]: (body.titel as string) || null,
    [KONTAKTE_FIELDS.anrede]: (body.anrede as string) || null,
    [KONTAKTE_FIELDS.strasse]: (body.strasse as string) || null,
    [KONTAKTE_FIELDS.plz]: (body.plz as string) || null,
    [KONTAKTE_FIELDS.ort]: (body.ort as string) || null,
    [KONTAKTE_FIELDS.geburtstag]: (body.geburtstag as string) || null,
    [KONTAKTE_FIELDS.email]: (body.email as string) || null,
    [KONTAKTE_FIELDS.telefon]: (body.telefon as string) || null,
    [KONTAKTE_FIELDS.telefon2]: (body.telefon2 as string) || null,
    [KONTAKTE_FIELDS.whatsapp]: (body.whatsapp as string) || null,
    [KONTAKTE_FIELDS.wechatId]: (body.wechat_id as string) || null,
    [KONTAKTE_FIELDS.linkedinUrl]: (body.linkedin_url as string) || null,
    [KONTAKTE_FIELDS.rolle]: (body.rolle as string) || null,
    [KONTAKTE_FIELDS.notizen]: (body.notizen as string) || null,
    [KONTAKTE_FIELDS.iban]: (body.iban as string) || null,
    [KONTAKTE_FIELDS.tags]: tags
  });

  return jsonOk({ contact: { id: rec.id, ...rec.fields } }, 201);
};
