
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkMaintenance() {
    const { data, error } = await supabase.from('site_settings').select('*').eq('key', 'maintenance').single();
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Maintenance Status:', data.value);
    }
}

checkMaintenance();
