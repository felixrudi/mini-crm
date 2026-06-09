import postgres from 'postgres';
// env via process.env

export const sql = postgres(process.env.DATABASE_URL as string);
