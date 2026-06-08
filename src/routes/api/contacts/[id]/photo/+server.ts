import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  const { id } = params;
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  if (!file) throw error(400, 'Kein Bild');

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mediaType = file.type || 'image/jpeg';
  const dataUrl = `data:${mediaType};base64,${base64}`;

  await sql`UPDATE contacts SET photo = ${dataUrl} WHERE id = ${id}`;
  return json({ photo: dataUrl });
};

export const DELETE: RequestHandler = async ({ params }) => {
  await sql`UPDATE contacts SET photo = NULL WHERE id = ${params.id}`;
  return json({ ok: true });
};
