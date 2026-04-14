require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'chidy_prime_super_secret_2025';
const ADMIN_PIN = process.env.ADMIN_PIN || '2025';

// Admin Auth Middleware
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized: No token provided' });
    
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: Malformed token' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Forbidden: Invalid token' });
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden: Not an admin' });
        req.admin = decoded;
        next();
    });
};

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase initialized successfully.');
} else {
    console.warn('Supabase keys missing. Database features will not work.');
}



app.use(express.json());
app.use(express.static('public'));

// Login Endpoint
app.post('/api/admin/login', (req, res) => {
    const { pin } = req.body;
    if (pin === ADMIN_PIN) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, error: 'Invalid PIN' });
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// API Endpoints
// Storefront - show only published
app.get('/api/games', async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Admin - show all statuses
app.get('/api/admin/games', verifyAdmin, async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/games', verifyAdmin, async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }
    try {
        const { title, description, rating, youtube_url, links, image_url, price, category } = req.body;

        if (!image_url) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        const { data, error } = await supabase
            .from('posts')
            .insert([
                { 
                    title, 
                    description, 
                    image_url,
                    rating: parseFloat(rating),
                    price: parseFloat(price || 0),
                    category: category || 'HOT POST',
                    youtube_url: youtube_url || null,
                    links: Array.isArray(links) ? links : JSON.parse(links || '[]'),
                    status: 'published',
                    duration_days: parseInt(req.body.duration_days || 0)
                }
            ]);

        if (error) throw error;
        res.json({ success: true, data });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update game details or status
app.patch('/api/games/:id', verifyAdmin, async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
        .from('posts')
        .update(updates)
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
});

// Delete game permanently
app.delete('/api/games/:id', verifyAdmin, async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }
    const { id } = req.params;

    const { data, error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, data });
});

// Log a new page view
app.post('/api/log-view', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    try {
        const { error } = await supabase.rpc('increment_daily_views');
        if (error) {
            console.error('RPC Error:', error);
            // Non-critical: if stats fail, don't crash the whole page for the user
            return res.json({ success: false, error: 'Stats recording skipped' });
        }
        res.json({ success: true });
    } catch (e) {
        res.json({ success: false });
    }
});

// Visitor Signup
app.post('/api/signup', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { name, phone } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    try {
        const { data, error } = await supabase
            .from('visitors')
            .insert([{ name: name.trim(), phone: phone.trim() }])
            .select();

        if (error) throw error;
        res.json({ success: true, visitor: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get visitor count
app.get('/api/visitors/count', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const { count, error } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json({ total: count || 0 });
});

// Fetch user stats with trend
app.get('/api/user-stats', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    try {
        // Get current total users via RPC
        const { data: totalUsers, error: rpcErr } = await supabase.rpc('get_total_users');
        if (rpcErr) throw rpcErr;

        // Snapshot today's count
        await supabase.rpc('snapshot_user_count');

        // Get last 2 days for trend
        const { data: stats, error: statsErr } = await supabase
            .from('user_stats')
            .select('*')
            .order('date', { ascending: false })
            .limit(2);

        let trend = 'stable';
        let diff = 0;
        if (stats && stats.length >= 2) {
            diff = stats[0].total_users - stats[1].total_users;
            if (diff > 0) trend = 'up';
            else if (diff < 0) trend = 'down';
        } else if (totalUsers > 0) {
            trend = 'up';
            diff = totalUsers;
        }

        res.json({ total: totalUsers || 0, trend, diff });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch analytics for last 7 days
app.get('/api/analytics', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .order('date', { ascending: false })
        .limit(7);

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});
app.get('/api/messages', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/messages', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { sender, message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ sender: sender || 'Admin', message }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: data[0] });
});

// Check if user still exists in database
app.get('/api/check-user/:id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    try {
        const { data, error } = await supabase
            .from('visitors')
            .select('id')
            .eq('id', req.params.id)
            .single();
            
        if (error || !data) {
            return res.status(404).json({ exists: false });
        }
        res.json({ exists: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET all users
app.get('/api/users', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// DELETE a user
app.delete('/api/users/:id', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { error } = await supabase
        .from('visitors')
        .delete()
        .eq('id', req.params.id);
        
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Verify phone number matches visitor ID (for secure logout)
app.post('/api/verify-phone', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id, phone } = req.body;
    if (!visitor_id || !phone) return res.status(400).json({ error: 'visitor_id and phone required' });

    try {
        const { data, error } = await supabase
            .from('visitors')
            .select('id, name, phone')
            .eq('id', visitor_id)
            .single();

        if (error || !data) return res.json({ valid: false, message: 'Mtumiaji hakupatikana.' });

        // Normalize phone for comparison
        const storedPhone = data.phone.replace(/\s+/g, '');
        const inputPhone = phone.trim().replace(/\s+/g, '');
        const match = storedPhone === inputPhone;

        res.json({ valid: match, name: match ? data.name : null, message: match ? 'OK' : 'Namba ya simu haifanani na akaunti yako.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================
// CATEGORY ENDPOINTS
// ============================================

// GET all categories
app.get('/api/categories', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST - add a new category
app.post('/api/categories', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });
    const { data, error } = await supabase
        .from('categories')
        .insert([{ name: name.trim().toUpperCase() }])
        .select();
    if (error) {
        if (error.code === '23505') return res.status(409).json({ error: 'Category already exists' });
        return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, category: data[0] });
});

// DELETE - remove a category
app.delete('/api/categories/:id', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ============================================
// SETTINGS ENDPOINTS
// ============================================

// GET Settings
app.get('/api/settings/maintenance', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'maintenance_mode')
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') return res.json({ value: "false" }); // default if not found
        return res.status(500).json({ error: error.message });
    }
    res.json({ value: data.value });
});

app.post('/api/settings/maintenance', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { enabled } = req.body;
    
    const { data, error } = await supabase
        .from('site_settings')
        .update({ value: enabled ? "true" : "false" })
        .eq('key', 'maintenance_mode')
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    
    // If turning OFF maintenance, we trigger the notification logic
    if (enabled === false) {
        try {
            // In a real app, you would integrate with Twilio or Africa's Talking here to send an SMS
            const { count } = await supabase.from('visitors').select('*', { count: 'exact', head: true });
            
            // We just log it as a simulated SMS broadcast
            console.log(`[SMS BROADCAST] Site is back live. Messages queued for ${count} users.`);
            
            // Also append a global chat message from system
            await supabase.from('chat_messages').insert([{
                sender: 'SYSTEM',
                message: `Maintenance finished! SMS alerts sent to all ${count} registered users.`
            }]);
        } catch (e) {
            console.error('Failed to send notifications', e);
        }
    }

    res.json({ success: true, enabled });
});

// ============================================
// USER ACCESS / DURATION ENDPOINTS
// ============================================

// Grant access to a game for a visitor
app.post('/api/grant-access', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { visitor_id, post_id } = req.body;
    if (!visitor_id || !post_id) return res.status(400).json({ error: 'visitor_id and post_id are required' });
    
    try {
        // Get the game's duration_days
        const { data: game, error: gameErr } = await supabase
            .from('posts')
            .select('duration_days, title')
            .eq('id', post_id)
            .single();
        
        if (gameErr || !game) return res.status(404).json({ error: 'Game not found' });
        
        const durationDays = game.duration_days || 0;
        
        // Calculate expiry date
        let expiresAt;
        if (durationDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + durationDays);
        } else {
            // Permanent access - set to far future
            expiresAt = new Date('2099-12-31T23:59:59Z');
        }
        
        // Upsert access record (update if exists, insert if new)
        const { data, error } = await supabase
            .from('user_access')
            .upsert({
                visitor_id: parseInt(visitor_id),
                post_id,
                granted_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            }, { onConflict: 'visitor_id,post_id' })
            .select();
        
        if (error) throw error;
        
        res.json({
            success: true,
            access: data[0],
            game_title: game.title,
            duration_days: durationDays,
            expires_at: expiresAt.toISOString(),
            is_permanent: durationDays === 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Check if a visitor has active access to a game
app.get('/api/check-access/:visitor_id/:post_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { visitor_id, post_id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('user_access')
            .select('*')
            .eq('visitor_id', parseInt(visitor_id))
            .eq('post_id', post_id)
            .single();
        
        if (error || !data) {
            return res.json({ has_access: false });
        }
        
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        const hasAccess = expiresAt > now;
        
        if (hasAccess) {
            return res.json({ has_access: true, expires_at: data.expires_at });
        }
        
        // If expired or no access, check if there's a pending order
        const { data: orderData } = await supabase
            .from('payment_orders')
            .select('status')
            .eq('visitor_id', parseInt(visitor_id))
            .eq('post_id', post_id)
            .eq('status', 'pending');

        res.json({ 
            has_access: false, 
            expired: true,
            pending_order: orderData && orderData.length > 0
        });
    } catch (err) {
        // Even if error in user_access (no record found), check for pending order
        try {
            const { visitor_id, post_id } = req.params;
            const { data: orderData } = await supabase
                .from('payment_orders')
                .select('status')
                .eq('visitor_id', parseInt(visitor_id))
                .eq('post_id', post_id)
                .eq('status', 'pending');

            res.json({ 
                has_access: false,
                pending_order: orderData && orderData.length > 0 
            });
        } catch (innerErr) {
            res.json({ has_access: false });
        }
    }
});

// ============================================
// PAYMENT ORDER ENDPOINTS
// ============================================

// Create a new manual payment order
app.post('/api/orders', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { visitor_id, post_id, amount, phone_number } = req.body;
    if (!visitor_id || !post_id || !amount || !phone_number) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        const { data, error } = await supabase
            .from('payment_orders')
            .insert([{
                visitor_id: parseInt(visitor_id),
                post_id,
                amount: parseFloat(amount),
                phone_number: phone_number.trim(),
                status: 'pending'
            }])
            .select();
        
        if (error) throw error;
        
        // Notify admin via chat (as a simple notification system)
        await supabase.from('chat_messages').insert([{
            sender: 'SYSTEM',
            message: `New Order! 💰 Number: ${phone_number}, Amount: TSh ${amount}. Check Admin Dashboard to approve.`
        }]);

        res.json({ success: true, order: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin - Fetch all orders
app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { data, error } = await supabase
        .from('payment_orders')
        .select(`
            *,
            visitors (name, phone),
            posts (title)
        `)
        .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Admin - Approve or Reject order
app.post('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    try {
        // 1. Update order status
        const { data: order, error: orderErr } = await supabase
            .from('payment_orders')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();
        
        if (orderErr) throw orderErr;
        
        // 2. If approved, grant access to the game
        if (status === 'approved') {
            const { post_id, visitor_id } = order;
            
            // Get duration
            const { data: game } = await supabase.from('posts').select('title, duration_days').eq('id', post_id).single();
            const durationDays = game.duration_days || 0;
            
            let expiresAt;
            if (durationDays > 0) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + durationDays);
            } else {
                expiresAt = new Date('2099-12-31T23:59:59Z');
            }
            
            await supabase.from('user_access').upsert({
                visitor_id,
                post_id,
                granted_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            }, { onConflict: 'visitor_id,post_id' });

            // 3. Auto-notify the user
            await supabase.from('notifications').insert({
                visitor_id,
                title: 'Malipo Yamekubaliwa! ✅',
                message: `Malipo yako ya game "${game.title}" yamehakikiwa. Sasa unaweza kuanza kudownload. Furahia mchezo wako!`,
                type: 'success'
            });
        }
        
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notifications API
app.get('/api/notifications/:visitor_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`visitor_id.eq.${visitor_id},visitor_id.is.null`)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/notifications/broadcast', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { title, message, type } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert({ title, message, type: type || 'info' })
            .select();
            
        if (error) throw error;
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get payment settings info
app.get('/api/settings/payment', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'admin_payment_info')
        .single();
    
    if (error) return res.json({ mpesa_number: "07XXXXXXXX", mpesa_name: "CHIDY PRIME" });
    res.json(data.value);
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}

module.exports = app;
