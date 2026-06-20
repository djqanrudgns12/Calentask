import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const startDate = '2026-05-01T00:00:00.000Z';
  const endDate = '2026-07-31T23:59:59.999Z';
  
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .or(`and(start_time.lte.${endDate},end_time.gte.${startDate},deleted_at.is.null),and(recurrence_rule.not.is.null,deleted_at.is.null),parent_activity_id.not.is.null`);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Count with current query:", data?.length);
  }

  // Without the complex OR
  const { data: data2, error: err2 } = await supabase
    .from('activities')
    .select('*')
    .lte('start_time', endDate)
    .gte('end_time', startDate)
    .is('deleted_at', null);

  if (err2) {
    console.error("Error2:", err2);
  } else {
    console.log("Count with simple filter:", data2?.length);
  }
}

run();
