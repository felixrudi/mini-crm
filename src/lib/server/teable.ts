// src/lib/server/teable.ts
// Replaces src/lib/db.ts. Request shapes verified against Henry's working
// Teable scripts (see plan Global Constraints) + Task 0 spike results.

const TEABLE_BASE = (process.env.TEABLE_BASE_URL ?? 'https://teable.hirschfeld.at').replace(/\/$/, '');
const TEABLE_API_KEY = process.env.TEABLE_API_KEY as string;

if (!TEABLE_API_KEY) {
  throw new Error('TEABLE_API_KEY not set');
}

const BASE_HEADERS = {
  Authorization: `Bearer ${TEABLE_API_KEY}`,
  // WAF on teable.hirschfeld.at blocks default Node/undici user-agents — confirmed
  // across every working script in the Henry repo. Do not remove.
  'User-Agent': 'curl/8'
};

export type TeableRecord<F = Record<string, unknown>> = {
  id: string;
  fields: F;
  createdTime?: string;
};

async function teableFetch(
  path: string,
  init: RequestInit = {},
  attempt = 1,
  okStatuses: number[] = []
): Promise<Response> {
  const res = await fetch(`${TEABLE_BASE}/api${path}`, {
    ...init,
    headers: { ...BASE_HEADERS, ...(init.headers ?? {}) }
  });
  if (!res.ok && res.status >= 500 && attempt < 3) {
    await new Promise((r) => setTimeout(r, 300 * attempt));
    return teableFetch(path, init, attempt + 1, okStatuses);
  }
  if (!res.ok && !okStatuses.includes(res.status)) {
    const body = await res.text();
    throw new Error(`Teable ${init.method ?? 'GET'} ${path} -> ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

/** Fetches every record in a table (paginated internally, take=1000/page). */
export async function listRecords<F = Record<string, unknown>>(
  tableId: string
): Promise<TeableRecord<F>[]> {
  const take = 1000;
  let skip = 0;
  const out: TeableRecord<F>[] = [];
  while (true) {
    const res = await teableFetch(`/table/${tableId}/record?take=${take}&skip=${skip}&fieldKeyType=name`);
    const data = (await res.json()) as { records: TeableRecord<F>[] };
    out.push(...data.records);
    if (data.records.length < take) break;
    skip += take;
  }
  return out;
}

export async function getRecord<F = Record<string, unknown>>(
  tableId: string,
  recordId: string
): Promise<TeableRecord<F> | null> {
  const res = await teableFetch(`/table/${tableId}/record/${recordId}?fieldKeyType=name`, {}, 1, [404]);
  if (res.status === 404) return null;
  return (await res.json()) as TeableRecord<F>;
}

export async function createRecord<F = Record<string, unknown>>(
  tableId: string,
  fields: Partial<F>
): Promise<TeableRecord<F>> {
  const res = await teableFetch(`/table/${tableId}/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ fields }], fieldKeyType: 'name', typecast: true })
  });
  const data = (await res.json()) as { records: TeableRecord<F>[] };
  return data.records[0];
}

export async function updateRecord<F = Record<string, unknown>>(
  tableId: string,
  recordId: string,
  fields: Partial<F>
): Promise<TeableRecord<F>> {
  const res = await teableFetch(`/table/${tableId}/record/${recordId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record: { fields }, fieldKeyType: 'name', typecast: true })
  });
  return (await res.json()) as TeableRecord<F>;
}

export async function deleteRecord(tableId: string, recordId: string): Promise<void> {
  await teableFetch(`/table/${tableId}/record/${recordId}`, { method: 'DELETE' });
}

// Per-table cache of field-name -> field-id. Unlike every other Teable REST
// endpoint (which accept fieldKeyType=name), the uploadAttachment endpoint
// only accepts the field ID in the URL path and 404s on a field name
// (confirmed live 2026-07-14: "Field Foto not found" with the name, 201 with
// the id). Resolve + cache so callers can keep passing the readable field
// name from teable-schema.ts.
const fieldIdCache = new Map<string, Map<string, string>>();

async function resolveFieldId(tableId: string, fieldName: string): Promise<string> {
  let table = fieldIdCache.get(tableId);
  if (!table) {
    const res = await teableFetch(`/table/${tableId}/field`);
    const fields = (await res.json()) as { id: string; name: string }[];
    table = new Map(fields.map((f) => [f.name, f.id]));
    fieldIdCache.set(tableId, table);
  }
  const fieldId = table.get(fieldName);
  if (!fieldId) throw new Error(`Teable field "${fieldName}" not found on table ${tableId}`);
  return fieldId;
}

export async function uploadAttachment(
  tableId: string,
  recordId: string,
  fieldName: string,
  file: File
): Promise<void> {
  const fieldId = await resolveFieldId(tableId, fieldName);
  const form = new FormData();
  form.append('file', file, file.name);
  await teableFetch(`/table/${tableId}/record/${recordId}/${fieldId}/uploadAttachment`, {
    method: 'POST',
    body: form
    // No Content-Type header — fetch sets the multipart boundary itself.
  });
}

/**
 * Shape of one entry in a Teable attachment field, as actually returned by
 * GET record (confirmed live 2026-07-14 against Kontakte_Real.Foto). There is
 * no plain `url` key — only time-limited signed URLs. `presignedUrl` serves
 * the original file; use it as the `<img src>` / download target.
 */
export type TeableAttachment = {
  id: string;
  name: string;
  mimetype?: string;
  path?: string;
  token?: string;
  presignedUrl: string;
  smThumbnailUrl?: string;
  lgThumbnailUrl?: string;
};

/** Read-side helper: pulls the servable URL out of one Teable attachment entry. */
export function attachmentUrl(att: TeableAttachment): string {
  return att.presignedUrl;
}

/** Write-side helper: wraps a record id into the array-of-object shape Teable expects for link fields. */
export function link(recordId: string | null | undefined): { id: string }[] | null {
  return recordId ? [{ id: recordId }] : null;
}

/** Read-side helper: a single-link field comes back as one object, not an array. */
export function linkId(field: unknown): string | null {
  if (!field) return null;
  if (Array.isArray(field)) return (field[0] as { id: string } | undefined)?.id ?? null;
  return (field as { id?: string }).id ?? null;
}

/** Read-side helper: pulls a lookup field's plain value out of Teable's response wrapper, if any. */
export function lookupValue<T = string>(field: unknown): T | null {
  if (field == null) return null;
  if (Array.isArray(field)) return (field[0] as T) ?? null;
  return field as T;
}
