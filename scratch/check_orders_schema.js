
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log("Checking payment_orders schema...");
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'payment_orders' });
    
    if (error) {
        console.error("Error fetching columns via RPC:", error);
        // Fallback: try a simple select with limit 1
        const { data: sample, error: sampleError } = await supabase.from('payment_orders').select('*').limit(1);
        if (sampleError) {
            console.error("Error fetching sample row:", sampleError);
        } else {
            console.log("Sample row columns:", Object.keys(sample[0] || {}));
        }
    } else {
        console.log("Columns:", data);
    }
}

checkSchema();
