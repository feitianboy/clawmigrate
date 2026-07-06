import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';

async function execQuery(sql: string) {
  const url = Deno.env.get('DATABASE_URL')!;
  const response = await fetch(`${url}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  return await response.json();
}

serve(async (req) => {
  try {
    const results: any[] = [];
    
    results.push({ step: 'grant-privileges', result: await execQuery('GRANT ALL ON public.admins TO service_role') });
    results.push({ step: 'grant-sequence', result: await execQuery('GRANT ALL ON SEQUENCE admins_id_seq TO service_role') });
    results.push({ step: 'drop-policy', result: await execQuery('DROP POLICY IF EXISTS "admins_no_anon_access" ON admins') });
    results.push({ step: 'create-policy', result: await execQuery('CREATE POLICY "admins_service_role_only" ON admins FOR ALL USING (true) WITH CHECK (true)') });
    results.push({ step: 'insert-admin', result: await execQuery(`INSERT INTO admins (username, password_hash) VALUES ('admin', '$2a$10$TtJKus8CxqVBM98ULfRBj.YiuYE66T35fmxwD4lA.4IuO7Sc9Iq7u') ON CONFLICT (username) DO NOTHING`) });
    results.push({ step: 'verify', result: await execQuery('SELECT id, username FROM admins WHERE username = \'admin\'') });

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});