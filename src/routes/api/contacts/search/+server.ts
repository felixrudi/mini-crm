import { sql } from '$lib/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';
  const kanal = url.searchParams.get('kanal') || '';

  let contacts;
  if (q && tag) {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}) AND ${tag} = ANY(c.tags) ORDER BY c.name LIMIT 100`;
  } else if (q && kanal === 'whatsapp') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}) AND c.whatsapp IS NOT NULL ORDER BY c.name LIMIT 100`;
  } else if (q && kanal === 'wechat') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}) AND c.wechat_id IS NOT NULL ORDER BY c.name LIMIT 100`;
  } else if (q) {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'} OR c.vorname ILIKE ${'%' + q + '%'} OR c.nachname ILIKE ${'%' + q + '%'} ORDER BY c.name LIMIT 50`;
  } else if (tag) {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE ${tag} = ANY(c.tags) ORDER BY c.name LIMIT 100`;
  } else if (kanal === 'whatsapp') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.whatsapp IS NOT NULL ORDER BY c.name LIMIT 100`;
  } else if (kanal === 'wechat') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.wechat_id IS NOT NULL ORDER BY c.name LIMIT 100`;
  } else {
    contacts = [];
  }

  return json({ contacts });
};
