const { Client } = require('pg');

async function main() {
  console.log('Connecting to Supabase database...');
  
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
    await client.connect();
    console.log('Connected successfully!');

    console.log('\nStep 1: Grant privileges to service_role...');
    await client.query('GRANT ALL ON public.admins TO service_role');
    console.log('✓ Privileges granted');

    console.log('\nStep 2: Drop old RLS policy...');
    await client.query('DROP POLICY IF EXISTS "admins_no_anon_access" ON admins');
    console.log('✓ RLS policy dropped');

    console.log('\nStep 3: Create new RLS policy...');
    await client.query('CREATE POLICY "admins_service_role_only" ON admins FOR ALL USING (true) WITH CHECK (true)');
    console.log('✓ RLS policy created');

    console.log('\nStep 4: Insert admin user...');
    await client.query(`
      INSERT INTO admins (username, password_hash) 
      VALUES ('admin', '$2a$10$TtJKus8CxqVBM98ULfRBj.YiuYE66T35fmxwD4lA.4IuO7Sc9Iq7u')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('✓ Admin user created');

    console.log('\nStep 5: Verify admin exists...');
    const result = await client.query('SELECT id, username FROM admins WHERE username = $1', ['admin']);
    console.log('✓ Admin verified:', result.rows[0]);

    console.log('\n✅ All operations completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.detail);
  } finally {
    await client.end();
  }
}

main();