import { test } from 'node:test';
import assert from 'node:assert/strict';

const skip = process.env.RUN_LIVE === '1' ? false : 'nur mit RUN_LIVE=1 (schreibt ins echte Teable)';

test('views.ts: create -> list -> rename -> delete Round-Trip gegen echtes Teable', { skip }, async () => {
  // Dynamischer Import nur wenn Test nicht übersprungen wird
  const { listViews, createView, renameView, deleteView } = await import('../src/lib/server/views.ts');

  const created = await createView('kontakte', 'TEST_TMP_ansicht', { tags: ['test'], tagMode: 'or' });
  try {
    const afterCreate = await listViews('kontakte');
    assert.ok(afterCreate.some((v) => v.id === created.id && v.name === 'TEST_TMP_ansicht'));

    await renameView(created.id, 'TEST_TMP_ansicht_umbenannt');
    const afterRename = await listViews('kontakte');
    const renamed = afterRename.find((v) => v.id === created.id);
    assert.equal(renamed?.name, 'TEST_TMP_ansicht_umbenannt');
    assert.deepEqual(renamed?.filter, { tags: ['test'], tagMode: 'or' });
  } finally {
    await deleteView(created.id);
  }

  const afterDelete = await listViews('kontakte');
  assert.ok(!afterDelete.some((v) => v.id === created.id));
});
