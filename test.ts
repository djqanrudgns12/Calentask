/* eslint-disable @typescript-eslint/no-unused-vars */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testInsert() {
  const { data: { user }, error: userError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com', // Need a valid user or just test insert without auth if RLS allows or insert fails
    password: 'password123'
  });
  
  // Actually, we can just insert and see the DB schema errors
  const { data, error } = await supabase.from('activities').insert([
    {
      title: 'Test Event',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      is_all_day: false,
      type: 'EVENT',
      memo: 'Test memo',
      hex_color: null,
      user_id: '123' // Fake
    }
  ]);
  
  console.log('Result:', data, error);
}

testInsert();

