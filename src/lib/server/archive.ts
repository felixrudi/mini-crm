/** Fügt 'archiv' hinzu, wenn nicht schon vorhanden. Nutzt die bestehende archiv-Tag-Infrastruktur (DEFAULT_TAGS_EXCLUDE, hatArchivUmschalter) statt eines eigenen Felds. */
export function addArchivTag(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
  return list.includes('archiv') ? list : [...list, 'archiv'];
}
