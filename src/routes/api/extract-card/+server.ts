import { json, error } from '@sveltejs/kit';
import { OPENROUTER_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

const PROMPT = `Extrahiere alle Kontaktdaten aus diesem Bild (Visitenkarte, WeChat-Profil, WhatsApp-Screenshot oder ähnliches) als JSON.
Gib NUR das JSON zurück, keine Erklärung, kein Markdown.

Bei WeChat-Screenshots:
- "name" = der fett gedruckte Anzeigename ganz oben (z.B. "Elon CQ Tinder")
- "chinesischer_name" = der Wert nach "Name:" (chinesische Zeichen, z.B. "怖匣")
- "wechat_id" = der Wert nach "WeChat ID:" (z.B. "elonla")
- "region" = der Wert nach "Region:" (z.B. "China's Mainland")

Schema:
{
  "anrede": "Herr" | "Frau" | null,
  "titel": string | null,
  "vorname": string | null,
  "nachname": string | null,
  "name": string | null,
  "chinesischer_name": string | null,
  "region": string | null,
  "firma": string | null,
  "rolle": string | null,
  "email": string | null,
  "telefon": string | null,
  "whatsapp": string | null,
  "wechat_id": string | null,
  "strasse": string | null,
  "plz": string | null,
  "ort": string | null,
  "website": string | null,
  "linkedin_url": string | null
}`;

export const POST: RequestHandler = async ({ request }) => {
  if (!OPENROUTER_API_KEY) throw error(500, 'OPENROUTER_API_KEY fehlt — dev server neu starten');

  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  if (!file) throw error(400, 'Kein Bild');

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = file.type || 'image/jpeg';

  const body = {
    model: 'google/gemini-2.5-flash',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
        { type: 'text', text: PROMPT }
      ]
    }]
  };

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://crm.hirschfeld.at',
    },
    body: JSON.stringify(body)
  });

  const raw = await res.text();
  if (!res.ok) {
    console.error('OpenRouter error', res.status, raw);
    throw error(500, `OpenRouter ${res.status}: ${raw.slice(0, 200)}`);
  }

  const result = JSON.parse(raw);
  const text = result.choices?.[0]?.message?.content ?? '';

  try {
    const data = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    return json(data);
  } catch {
    console.error('JSON parse error, raw text:', text);
    return json({});
  }
};
