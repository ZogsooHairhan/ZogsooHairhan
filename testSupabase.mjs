import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fhtgqewsebvmebbvuwpq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZodGdxZXdzZWJ2bWViYnZ1d3BxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTI4MDEsImV4cCI6MjA5NTg2ODgwMX0._tAfHd-0g2_DWWUOnYtl34lF6q3TBAKShwulpw85b9M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing Supabase Insert...");
  const { data, error } = await supabase
    .from('orders')
    .insert([{ table_number: "test", phone_number: "123", total_amount: 1000, status: "new" }])
    .select();
    
  if (error) {
    console.error("Supabase Error Details:", error);
  } else {
    console.log("Insert Success:", data);
  }
}
test();
const { data, error } = await supabase
  .from('orders')
  .insert([{
    table_number: 1, // Заавал тоо байна (жишээ нь 1)
    customer_phone: "123", // Нэр нь phone_number биш байна
    total_amount: 1000,
    status: "pending", // new гэж болох ч pending нь илүү тохиромжтой
    order_type: "dine-in" // Энэ утгыг заавал нэмнэ
  }])
  .select();