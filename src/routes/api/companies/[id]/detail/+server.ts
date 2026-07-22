import { loadCompanyDetail } from '$lib/server/detail-loaders';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const data = await loadCompanyDetail(params.id);
  if (!data) throw error(404, 'Firma nicht gefunden');
  return json(data);
};
