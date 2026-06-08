import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const files = await sql`
    SELECT id, filename, mimetype, created_at,
      CASE WHEN mimetype LIKE 'image/%' THEN data ELSE NULL END as data
    FROM contact_files WHERE contact_id = ${params.id} ORDER BY created_at DESC`;
  return json({ files });
};

export const POST: RequestHandler = async ({ request, params }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw error(400, 'Keine Datei');

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const mimetype = file.type || 'application/octet-stream';
  const data = `data:${mimetype};base64,${base64}`;

  const [row] = await sql`
    INSERT INTO contact_files (contact_id, filename, mimetype, data)
    VALUES (${params.id}, ${file.name}, ${mimetype}, ${data})
    RETURNING id, filename, mimetype, created_at,
      CASE WHEN mimetype LIKE 'image/%' THEN data ELSE NULL END as data`;

  return json({ file: row });
};
