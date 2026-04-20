const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkRPCs() {
    console.log('Checking RPCs...');
    
    const { data: total, error: totalErr } = await supabase.rpc('get_total_users');
    if (totalErr) {
        console.log('get_total_users error:', totalErr.message);
    } else {
        console.log('get_total_users exists. Result:', total);
    }

    const { data: snapshot, error: snapshotErr } = await supabase.rpc('snapshot_user_count');
    if (snapshotErr) {
        console.log('snapshot_user_count error:', snapshotErr.message);
    } else {
        console.log('snapshot_user_count exists.');
    }
}

checkRPCs();
