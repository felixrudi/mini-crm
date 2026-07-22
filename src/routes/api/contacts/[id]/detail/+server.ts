import { loadContactDetail } from '$lib/server/detail-loaders';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const data = await loadContactDetail(params.id);
  if (!data) throw error(404, 'Kontakt nicht gefunden');
  return json(data);
};
