// src/lib/server/views.ts
// CRUD-Wrapper um die Gespeicherte_Ansichten-Tabelle in Teable.
import { listRecords, createRecord, updateRecord, deleteRecord } from './teable.ts';
import { TABLES, ANSICHTEN_FIELDS } from './teable-schema.ts';
import type { Seite, SavedView, ViewFilter } from '../types.ts';

function parseFilter(raw: unknown): ViewFilter {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    return JSON.parse(raw) as ViewFilter;
  } catch {
    return {};
  }
}

export async function listViews(seite: Seite): Promise<SavedView[]> {
  const recs = await listRecords(TABLES.ansichten);
  return recs
    .filter((r) => r.fields[ANSICHTEN_FIELDS.seite] === seite)
    .map((r) => ({
      id: r.id,
      name: r.fields[ANSICHTEN_FIELDS.name] as string,
      seite,
      filter: parseFilter(r.fields[ANSICHTEN_FIELDS.filter])
    }));
}

export async function createView(seite: Seite, name: string, filter: ViewFilter): Promise<SavedView> {
  const rec = await createRecord(TABLES.ansichten, {
    [ANSICHTEN_FIELDS.name]: name,
    [ANSICHTEN_FIELDS.seite]: seite,
    [ANSICHTEN_FIELDS.filter]: JSON.stringify(filter),
    [ANSICHTEN_FIELDS.erstelltAm]: new Date().toISOString()
  });
  return { id: rec.id, name, seite, filter };
}

export async function renameView(id: string, name: string): Promise<void> {
  await updateRecord(TABLES.ansichten, id, { [ANSICHTEN_FIELDS.name]: name });
}

export async function deleteView(id: string): Promise<void> {
  await deleteRecord(TABLES.ansichten, id);
}
