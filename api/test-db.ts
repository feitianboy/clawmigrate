import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const databaseUrl = process.env.DATABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const attempts: any[] = [];

  const tryConnect = async (host: string, port: number, user: string, password: string, label: string) => {
    const { Client } = await import('pg');
    const client = new Client({
      host, port, database: 'postgres', user, password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 30000,
    });
    try {
      await client.connect();
      const result = await client.query('SELECT version()');
      await client.end();
      return { ok: true, label, version: result.rows[0].version };
    } catch (error: any) {
      await client.end();
      return { ok: false, label, error: error.message, code: error.code };
    }
  };

  if (databaseUrl) {
    try {
      const u = new URL(databaseUrl);
      const dbHost = u.hostname;
      const dbPort = parseInt(u.port || '5432');
      const dbUser = decodeURIComponent(u.username);
      const dbPassword = decodeURIComponent(u.password);
      
      attempts.push(await tryConnect(dbHost, 5432, 'postgres', serviceKey || '', 'direct-5432-postgres-servicekey'));
      attempts.push(await tryConnect(dbHost, 5432, 'postgres', dbPassword, 'direct-5432-postgres-original'));
      attempts.push(await tryConnect(dbHost, 6543, 'postgres', serviceKey || '', 'pooler-6543-postgres-servicekey'));
      attempts.push(await tryConnect(dbHost, 6543, 'postgres', dbPassword, 'pooler-6543-postgres-original'));
      attempts.push(await tryConnect(dbHost, 6543, dbUser, dbPassword, 'pooler-6543-original'));
    } catch {}
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  if (projectRef && serviceKey) {
    attempts.push(await tryConnect(`db.${projectRef}.supabase.co`, 5432, 'postgres', serviceKey, 'direct-postgres-servicekey'));
  }

  const success = attempts.find(a => a.ok);
  if (success) {
    return res.json({ ok: true, message: 'Connection test successful', attempts });
  }

  return res.status(500).json({ ok: false, error: 'All connection attempts failed', attempts });
}