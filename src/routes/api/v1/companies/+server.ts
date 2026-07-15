import { listRecords, createRecord } from '$lib/server/teable';
import { TABLES, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import { checkApiAuth, jsonOk, jsonError } from '$lib/api-auth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
  const denied = checkApiAuth(request);
  if (denied) return denied;

  const q = (url.searchParams.get('q') || '').toLowerCase();
  const all = await listRecords(TABLES.firmen);
  const filtered = q
    ? all.filter((c) => String(c.fields[FIRMEN_FIELDS.name] ?? '').toLowerCase().includes(q))
    : all;
  const companies = filtered
    .slice(0, q ? 50 : 200)
    .map((r): Record<string, unknown> => ({ id: r.id, ...r.fields }))
    .sort((a, b) => String(a[FIRMEN_FIELDS.name]).localeCompare(String(b[FIRMEN_FIELDS.name])));

  return jsonOk({ companies });
};

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

  const all = await listRecords(TABLES.firmen);
  const existing = all.find((c) => String(c.fields[FIRMEN_FIELDS.name] ?? '').toLowerCase() === name.toLowerCase());
  if (existing) return jsonOk({ company: { id: existing.id, ...existing.fields }, created: false });

  const rec = await createRecord(TABLES.firmen, {
    [FIRMEN_FIELDS.name]: name,
    [FIRMEN_FIELDS.website]: (body.website as string) || null,
    [FIRMEN_FIELDS.telefon]: (body.telefon as string) || null,
    [FIRMEN_FIELDS.strasse]: (body.strasse as string) || null,
    [FIRMEN_FIELDS.plz]: (body.plz as string) || null,
    [FIRMEN_FIELDS.ort]: (body.ort as string) || null,
    [FIRMEN_FIELDS.land]: (body.land as string) || null,
    [FIRMEN_FIELDS.notizen]: (body.notizen as string) || null
  });

  return jsonOk({ company: { id: rec.id, ...rec.fields }, created: true }, 201);
};
