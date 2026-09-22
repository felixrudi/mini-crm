/** Heutiges Datum als YYYY-MM-DD in Ortszeit (toISOString liefert UTC und springt abends auf morgen). */
export function localIsoDate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
