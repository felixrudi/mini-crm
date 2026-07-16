// src/lib/server/tag-rename.ts
// Tags sind reine Freitext-Strings, dupliziert im Tags-Array jedes Records
// (keine eigene Tags-Tabelle, keine IDs) — ein Rename ist also Bulk-
// Find&Replace über alle Records, die den alten Tag tragen, mit Dedupe falls
// der neue Name im selben Array schon vorkommt. Kein Bulk-Update-Endpoint in
// teable.ts — Tag-Mengen sind klein genug für Promise.all über Einzel-PATCH.
import { listRecords, updateRecord } from './teable.ts';

export async function renameTagBulk(
  tableId: string,
  tagsField: string,
  oldTagRaw: string,
  newTagRaw: string
): Promise<number> {
  const oldTag = oldTagRaw.trim().toLowerCase();
  const newTag = newTagRaw.trim().toLowerCase();
  if (!oldTag || !newTag || oldTag === newTag) return 0;

  const recs = await listRecords(tableId);
  const affected = recs.filter((r) => ((r.fields[tagsField] as string[] | undefined) ?? []).includes(oldTag));

  await Promise.all(
    affected.map((r) => {
      const tags = (r.fields[tagsField] as string[] | undefined) ?? [];
      const updated = [...new Set(tags.map((t) => (t === oldTag ? newTag : t)))];
      return updateRecord(tableId, r.id, { [tagsField]: updated });
    })
  );

  return affected.length;
}
