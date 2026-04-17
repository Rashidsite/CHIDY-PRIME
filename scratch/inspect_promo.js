const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkColumns() {
    // Try to fetch one row to see structure
    const { data, error } = await supabase.from('promo_codes').select('*').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Data:', data);
    }
}

checkColumns();
