
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkRecentOrders() {
    console.log("Checking 5 most recent orders...");
    const { data, error } = await supabase
        .from('payment_orders')
        .select(`
            id,
            visitor_id,
            post_id,
            amount,
            phone_number,
            status,
            created_at,
            promo_used
        `)
        .order('created_at', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error("Error fetching orders:", error);
    } else {
        console.log("Recent Orders in DB:", JSON.stringify(data, null, 2));
    }
}

checkRecentOrders();
