// src/routes/api/views/+server.ts
import { json } from '@sveltejs/kit';
import { createView, renameView, deleteView } from '$lib/server/views';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const { seite, name, filter } = await request.json();
  if (!seite || !name) return json({ error: 'seite und name erforderlich' }, { status: 400 });
  const view = await createView(seite, name, filter ?? {});
  return json(view);
};

export const PATCH: RequestHandler = async ({ request }) => {
  const { id, name } = await request.json();
  if (!id || !name) return json({ error: 'id und name erforderlich' }, { status: 400 });
  await renameView(id, name);
  return json({ success: true });
};

export const DELETE: RequestHandler = async ({ request }) => {
  const { id } = await request.json();
  if (!id) return json({ error: 'id erforderlich' }, { status: 400 });
  await deleteView(id);
  return json({ success: true });
};
