const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
  const { data: { user }, error } = await supabase.auth.admin.getUserById('1a52adcc-952c-472b-a066-e42072f76164');
  console.log("User Identities:", JSON.stringify(user.identities, null, 2));
  
  const { data: dbUser } = await supabase.from('users').select('*').eq('id', '1a52adcc-952c-472b-a066-e42072f76164').single();
  console.log("DB User:", JSON.stringify(dbUser, null, 2));
}

checkUser();
