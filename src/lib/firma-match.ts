export function normalizeFirmaName(s: string): string {
  return s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function findFirmaId(
  companies: { id: string; fields: Record<string, unknown> }[],
  nameField: string,
  wanted: string
): string | null {
  const target = normalizeFirmaName(wanted);
  if (!target) return null;
  for (const c of companies) {
    const n = c.fields[nameField];
    if (typeof n === 'string' && normalizeFirmaName(n) === target) return c.id;
  }
  return null;
}
