/** Zählt aktive Filter für das Badge am Aufklapper "Filter". Sortierung zählt bewusst nicht mit — sie hat immer einen Wert und ist kein Ausschluss-Filter. */
export function activeFilterCount(input: {
  tags: string[];
  tagsExclude: string[];
  ort: string;
  group: string;
}): number {
  return input.tags.length + input.tagsExclude.length + (input.ort ? 1 : 0) + (input.group ? 1 : 0);
}
