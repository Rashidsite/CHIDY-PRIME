require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing Supabase connection...');
    const { data, error, count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Connection Error:', error);
    } else {
        console.log('Connection Successful! Post count:', count);
    }
}

test();
