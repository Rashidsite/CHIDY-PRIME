
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkVisitorsSchema() {
    console.log("Checking visitors schema...");
    const { data: sample, error: sampleError } = await supabase.from('visitors').select('*').limit(1);
    if (sampleError) {
        console.error("Error fetching sample row:", sampleError);
    } else {
        console.log("Sample row columns and values:", sample[0]);
    }
}

checkVisitorsSchema();
