/**
 * Create admin user: contact.awais.ai@gmail.com with password Lassi.0
 * Run from backend: node scripts/create-admin-user.js
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'contact.awais.ai@gmail.com';
const ADMIN_PASSWORD = 'Lassi.0';
const ADMIN_NAME = 'Admin';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Creating admin user:', ADMIN_EMAIL);

  // 1. Create or get auth user (no password in auth - we use user_passwords for backend login)
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  let userId;
  if (existing) {
    userId = existing.id;
    console.log('Auth user already exists:', userId);
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_NAME },
    });
    if (createErr) {
      console.error('Failed to create auth user:', createErr.message);
      process.exit(1);
    }
    userId = newUser.user.id;
    console.log('Created auth user:', userId);
  }

  // 2. Upsert profile
  const { error: profileErr } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileErr) {
    console.error('Failed to upsert profile:', profileErr.message);
    process.exit(1);
  }
  console.log('Profile upserted');

  // 3. Upsert user_passwords (bcrypt hash for backend login)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const { error: pwErr } = await supabase.from('user_passwords').upsert(
    {
      user_id: userId,
      password_hash: passwordHash,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (pwErr) {
    console.error('Failed to upsert user_passwords:', pwErr.message);
    process.exit(1);
  }
  console.log('Password set');

  console.log('\nDone! You can now log in with:');
  console.log('  Email:', ADMIN_EMAIL);
  console.log('  Password:', ADMIN_PASSWORD);
  console.log('\nThen go to /admin to access the Admin Panel.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
