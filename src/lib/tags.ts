// src/lib/tags.ts
// Geteilte Tag-Farb-Hash-Funktion + Tag-basierte Gruppierung, genutzt von
// Kontakten und Firmen.

const TAG_COLORS = [
  'bg-terracotta/10 text-terracotta border-terracotta/20',
  'bg-sage/10 text-sage border-sage/20',
  'bg-blue-50 text-blue-600 border-blue-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200'
];

export function tagColor(tag: string): string {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export type TagGroup<T> = { tag: string; items: T[] };

/**
 * Ein Item mit mehreren Tags erscheint in jeder passenden Gruppe (Dopplung
 * gewollt). Items ohne Tags landen in einer eigenen Gruppe "Ohne Tags" am
 * Ende. Tag-Gruppen sind alphabetisch sortiert.
 */
export function groupByTags<T>(items: T[], tagsOf: (item: T) => string[]): TagGroup<T>[] {
  const byTag = new Map<string, T[]>();
  const untagged: T[] = [];

  for (const item of items) {
    const tags = tagsOf(item);
    if (tags.length === 0) {
      untagged.push(item);
      continue;
    }
    for (const tag of tags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(item);
    }
  }

  const groups: TagGroup<T>[] = [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, groupItems]) => ({ tag, items: groupItems }));

  if (untagged.length > 0) groups.push({ tag: 'Ohne Tags', items: untagged });

  return groups;
}
