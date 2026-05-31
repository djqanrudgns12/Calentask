require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testUpsert() {
  // Get the user (or just use a dummy user_id if we bypass RLS with service role)
  // Let's just find the first user
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  if (userError || !users.users.length) {
    console.error('Failed to get users', userError)
    return
  }
  
  const userId = users.users[0].id
  
  const { data, error } = await supabase
    .from('user_security_pin')
    .upsert({
      user_id: userId,
      hashed_pin: 'testpin123',
      security_question: 'test_question',
      security_answer: 'test_answer',
      enabled: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })
    
  if (error) {
    console.error('UPSERT ERROR:', error)
  } else {
    console.log('UPSERT SUCCESS:', data)
  }
}

testUpsert()
