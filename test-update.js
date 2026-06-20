const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminClient = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const updatePayload = {
    google_email: 'test@gmail.com',
    google_name: 'test',
    is_google_linked: true
  };
  const { data, error } = await adminClient
    .from('users')
    .update(updatePayload)
    .eq('id', '1a52adcc-952c-472b-a066-e42072f76164')
    .select();
  
  console.log("Error:", error);
  console.log("Data:", data);
}

testUpdate();
