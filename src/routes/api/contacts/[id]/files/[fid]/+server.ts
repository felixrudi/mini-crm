import { json, error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
  const [row] = await sql`SELECT id FROM contact_files WHERE id = ${params.fid} AND contact_id = ${params.id}`;
  if (!row) throw error(404, 'Nicht gefunden');
  await sql`DELETE FROM contact_files WHERE id = ${params.fid}`;
  return json({ ok: true });
};

export const GET: RequestHandler = async ({ params }) => {
  const [row] = await sql`SELECT filename, mimetype, data FROM contact_files WHERE id = ${params.fid} AND contact_id = ${params.id}`;
  if (!row) throw error(404, 'Nicht gefunden');
  const base64 = row.data.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  return new Response(buffer, {
    headers: {
      'Content-Type': row.mimetype,
      'Content-Disposition': `attachment; filename="${row.filename}"`,
    }
  });
};
