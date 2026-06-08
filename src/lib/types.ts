export type Company = {
  id: string;
  name: string;
  website: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  land: string | null;
  notizen: string | null;
  created_at: string;
  contact_count?: number;
}

export type Contact = {
  id: string;
  company_id: string | null;
  name: string;
  vorname: string | null;
  nachname: string | null;
  titel: string | null;
  anrede: 'Herr' | 'Frau' | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  geburtstag: string | null;
  email: string | null;
  telefon: string | null;
  whatsapp: string | null;
  wechat_id: string | null;
  linkedin_url: string | null;
  rolle: string | null;
  notizen: string | null;
  photo: string | null;
  tags: string[];
  telefon2: string | null;
  iban: string | null;
  created_at: string;
  companies?: { name: string } | null;
  company_name?: string | null;
}

export type Interaction = {
  id: string;
  contact_id: string;
  typ: string;
  datum: string;
  zusammenfassung: string | null;
  text: string | null;
  created_at: string;
}

export type Email = {
  id: string;
  contact_id: string | null;
  richtung: 'rein' | 'raus';
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
  von: string | null;
  an: string | null;
  cc: string | null;
  betreff: string | null;
  body_html: string | null;
  body_text: string | null;
  datum: string;
  created_at: string;
}

export type Action = {
  id: string;
  contact_id: string | null;
  titel: string;
  status: 'offen' | 'erledigt';
  faellig_am: string | null;
  notizen: string | null;
  created_at: string;
  contact_name?: string | null;
}

export type ProspectStatus = 'gesendet' | 'geantwortet' | 'termin' | 'kein_interesse' | 'bounce' | 'abgesagt';

export type Prospect = {
  id: string;
  name: string;
  vorname: string | null;
  nachname: string | null;
  titel: string | null;
  anrede: 'Herr' | 'Frau' | null;
  email: string | null;
  firma: string | null;
  company_id: string | null;
  company_name: string | null;
  rolle: string | null;
  telefon: string | null;
  website: string | null;
  notizen: string | null;
  status: ProspectStatus;
  kanal: string | null;
  versandt_am: string | null;
  followup_am: string | null;
  sperre: boolean;
  sperre_grund: string | null;
  created_at: string;
}

export type TimelineEntry = {
  contact_id: string;
  art: 'interaction' | 'email';
  eintrag_id: string;
  subtyp: string;
  datum: string;
  titel: string | null;
  inhalt: string | null;
}
