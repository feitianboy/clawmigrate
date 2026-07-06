const { Client } = require('pg');

async function main() {
  console.log('Trying pooler connection with longer timeout...');
  
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.abpiryofzphbtqmjwjqk',
    password: '2aRDtCzL6QUJUXtu',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
    idleTimeoutMillis: 60000,
  });

  try {
    console.log('Connecting...');
    await client.connect();
    console.log('✓ Connected!');
    
    console.log('\nGranting privileges...');
    await client.query('GRANT ALL ON public.admins TO service_role');
    console.log('✓ Privileges granted!');
    
    console.log('\nDropping old policy...');
    await client.query('DROP POLICY IF EXISTS "admins_no_anon_access" ON admins');
    console.log('✓ Old policy dropped!');
    
    console.log('\nCreating new policy...');
    await client.query('CREATE POLICY "admins_service_role_only" ON admins FOR ALL USING (true) WITH CHECK (true)');
    console.log('✓ New policy created!');
    
    console.log('\nInserting admin...');
    await client.query(`
      INSERT INTO admins (username, password_hash) 
      VALUES ('admin', '$2a$10$TtJKus8CxqVBM98ULfRBj.YiuYE66T35fmxwD4lA.4IuO7Sc9Iq7u')
      ON CONFLICT (username) DO NOTHING
    `);
    console.log('✓ Admin inserted!');
    
    const result = await client.query('SELECT id, username FROM admins WHERE username = $1', ['admin']);
    console.log('✓ Admin verified:', result.rows[0]);
    
    await client.end();
    console.log('\n✅ ALL DONE!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Error code:', error.code);
    await client.end();
  }
}

main();