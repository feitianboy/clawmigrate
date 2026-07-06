const { Client } = require('pg');

async function main() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.abpiryofzphbtqmjwjqk',
    password: '2aRDtCzL6QUJUXtu',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✓ Connected!');
    
    console.log('\nStep 1: Granting privileges...');
    await client.query('GRANT ALL ON public.admins TO service_role');
    console.log('✓ Done');
    
    console.log('\nStep 2: Dropping old policy...');
    await client.query('DROP POLICY IF EXISTS "admins_no_anon_access" ON admins');
    console.log('✓ Done');
    
    console.log('\nStep 3: Creating new policy...');
    await client.query('CREATE POLICY "admins_service_role_only" ON admins FOR ALL USING (true) WITH CHECK (true)');
    console.log('✓ Done');
    
    console.log('\nStep 4: Inserting admin...');
    await client.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING', ['admin', '$2a$10$TtJKus8CxqVBM98ULfRBj.YiuYE66T35fmxwD4lA.4IuO7Sc9Iq7u']);
    console.log('✓ Done');
    
    console.log('\nStep 5: Verifying...');
    const result = await client.query('SELECT id, username FROM admins WHERE username = $1', ['admin']);
    console.log('✓ Admin created:', result.rows[0]);
    
    await client.end();
    console.log('\n✅ ALL DONE!');
  } catch(e) {
    console.error('\n❌ Error:', e.message);
    process.exit(1);
  }
}

main();