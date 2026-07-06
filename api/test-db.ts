import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.status(500).json({ ok: false, error: 'DATABASE_URL not set' });
  }

  const { Client } = await import('pg');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });

  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    await client.end();
    return res.json({ ok: true, version: result.rows[0].version });
  } catch (error: any) {
    await client.end();
    return res.status(500).json({ ok: false, error: error.message, code: error.code });
  }
}