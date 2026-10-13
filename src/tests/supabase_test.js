import { supabase } from '../supabaseClient';

async function test() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name')
    .limit(1);

  if (error) {
    console.error('Supabase connection test failed:', error);
  } else {
    console.log('Supabase connection succeeded. Sample record:', data);
  }
}

test();
