/**
 * Standard-Ausschluss ist genau ['archiv'] (archivierte Einträge ausgeblendet) — das ist der
 * Normalzustand beim Laden ohne URL-Filter und zählt bewusst nicht als aktiver Filter, sonst würde
 * der Aufklapper "Filter" im Normalzustand immer mit Badge "1" offen starten. Jede Abweichung davon
 * zählt: ein zusätzlich ausgeschlossener Tag zählt 1, und wenn 'archiv' selbst nicht mehr
 * ausgeschlossen wird (z.B. die "Alle"-Ansicht), zählt das ebenfalls 1.
 */
function excludeFilterCount(tagsExclude: string[]): number {
  const extra = tagsExclude.filter((t) => t !== 'archiv').length;
  const archivRemoved = tagsExclude.includes('archiv') ? 0 : 1;
  return extra + archivRemoved;
}

/** Zählt aktive Filter für das Badge am Aufklapper "Filter". Sortierung zählt bewusst nicht mit — sie hat immer einen Wert und ist kein Ausschluss-Filter. */
export function activeFilterCount(input: {
  tags: string[];
  tagsExclude: string[];
  ort: string;
  group: string;
}): number {
  return input.tags.length + excludeFilterCount(input.tagsExclude) + (input.ort ? 1 : 0) + (input.group ? 1 : 0);
}
