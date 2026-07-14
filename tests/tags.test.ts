import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tagColor, groupByTags } from '../src/lib/tags.ts';

test('tagColor: gleicher Tag ergibt immer dieselbe Klasse', () => {
  assert.equal(tagColor('felix'), tagColor('felix'));
});

test('tagColor: gibt eine nicht-leere CSS-Klassen-Kette zurück', () => {
  assert.match(tagColor('steuerberater'), /bg-/);
});

test('groupByTags: Item mit mehreren Tags erscheint in jeder passenden Gruppe', () => {
  const items = [{ id: 1, tags: ['felix', 'steuerberater'] }];
  const groups = groupByTags(items, (i) => i.tags);
  assert.equal(groups.length, 2);
  assert.ok(groups.every((g) => g.items[0].id === 1));
});

test('groupByTags: Items ohne Tags landen in "Ohne Tags" am Ende', () => {
  const items = [
    { id: 1, tags: ['a'] },
    { id: 2, tags: [] }
  ];
  const groups = groupByTags(items, (i) => i.tags);
  assert.equal(groups[groups.length - 1].tag, 'Ohne Tags');
  assert.deepEqual(groups[groups.length - 1].items.map((i) => i.id), [2]);
});

test('groupByTags: Tag-Gruppen sind alphabetisch sortiert', () => {
  const items = [
    { id: 1, tags: ['zeta'] },
    { id: 2, tags: ['alpha'] }
  ];
  const groups = groupByTags(items, (i) => i.tags);
  assert.deepEqual(groups.map((g) => g.tag), ['alpha', 'zeta']);
});
