import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Kein Dashboard mehr (Entscheidung Felix, 28.08.2026). Die Startseite ist die
// Kontaktliste — der Überblick entsteht dort über Ansichten, Tag-Filter und die
// Sortierung „Zuletzt aktiv“, nicht über eine eigene Seite mit Kacheln.
// Die frühere Seite zeigte Outreach-Kennzahlen und Antwort-Wiedervorlagen; beides
// liegt in der Marketing-Base (Outreach tblLHWeNN9dq1ObUE0D) und wird dort und im
// täglichen Abgleich weitergeführt.
export const load: PageServerLoad = async () => {
  redirect(307, '/contacts');
};
