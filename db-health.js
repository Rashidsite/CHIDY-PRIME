require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL or SUPABASE_ANON_KEY missing in .env!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
    'visitors',
    'posts',
    'videos',
    'payment_orders',
    'user_access',
    'site_settings',
    'categories',
    'chat_messages',
    'pending_gifts',
    'affiliate_earnings',
    'withdrawals'
];

async function checkDatabase() {
    console.log("Starting Database Health Check...");
    console.log("Supabase URL:", supabaseUrl);
    
    for (const table of tables) {
        try {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            
            if (error) {
                console.error(`❌ Table "${table}": Error ->`, error.message, `(${error.code})`);
            } else {
                console.log(`✅ Table "${table}": Working -> ${count} rows`);
            }
        } catch (e) {
            console.error(`❌ Table "${table}": System Exception ->`, e.message);
        }
    }
}

checkDatabase();
