
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function setMaintenance(value) {
    console.log('Setting maintenance to:', value);
    const { error } = await supabase.from('site_settings').upsert({ key: 'maintenance', value: value.toString() }, { onConflict: 'key' });
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Maintenance updated successfully.');
    }
}

setMaintenance(false);
