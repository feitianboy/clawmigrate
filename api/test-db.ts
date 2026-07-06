import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const databaseUrl = process.env.DATABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  
  if (!databaseUrl || !serviceKey) {
    return res.status(500).json({ ok: false, error: 'Missing environment variables' });
  }

  try {
    const u = new URL(databaseUrl);
    const dbHost = u.hostname;
    const dbPort = parseInt(u.port || '5432');
    const dbUser = decodeURIComponent(u.username);
    const dbPassword = decodeURIComponent(u.password);

    const { Client } = await import('pg');
    const client = new Client({
      host: 'aws-0-ap-southeast-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      user: 'postgres.abpiryofzphbtqmjwjqk',
      password: dbPassword,
      ssl: { 
        rejectUnauthorized: false,
        servername: `db.${projectRef}.supabase.co`
      },
      connectionTimeoutMillis: 30000,
    });

    await client.connect();

    await client.query('GRANT ALL ON public.admins TO service_role');
    await client.query('GRANT ALL ON SEQUENCE admins_id_seq TO service_role');
    await client.query('DROP POLICY IF EXISTS "admins_no_anon_access" ON admins');
    await client.query('CREATE POLICY "admins_service_role_only" ON admins FOR ALL USING (true) WITH CHECK (true)');
    await client.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING', ['admin', '$2a$10$TtJKus8CxqVBM98ULfRBj.YiuYE66T35fmxwD4lA.4IuO7Sc9Iq7u']);
    
    const result = await client.query('SELECT id, username FROM admins WHERE username = $1', ['admin']);
    
    await client.end();

    return res.json({ ok: true, message: 'Admin created successfully!', admin: result.rows[0] });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message, code: error.code });
  }
}