export function splitEmails(raw: string | null | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function contactMatchesEmail(
  contactEmailField: string | null | undefined,
  wanted: string
): boolean {
  const target = wanted.trim().toLowerCase();
  if (!target) return false;
  return splitEmails(contactEmailField).includes(target);
}
