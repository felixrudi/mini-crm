import Anthropic from '@anthropic-ai/sdk';
import { json, error } from '@sveltejs/kit';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export const POST: RequestHandler = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  if (!file) throw error(400, 'Kein Bild');

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp';

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64 }
        },
        {
          type: 'text',
          text: `Extrahiere alle Kontaktdaten aus dieser Visitenkarte als JSON. Gib NUR das JSON zurück, nichts anderes.
Schema:
{
  "anrede": "Herr" | "Frau" | null,
  "titel": string | null,
  "vorname": string | null,
  "nachname": string | null,
  "name": string | null,
  "firma": string | null,
  "rolle": string | null,
  "email": string | null,
  "telefon": string | null,
  "strasse": string | null,
  "plz": string | null,
  "ort": string | null,
  "website": string | null,
  "linkedin_url": string | null
}`
        }
      ]
    }]
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  try {
    const data = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    return json(data);
  } catch {
    return json({});
  }
};
