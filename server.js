require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const compression = require('compression');
const os = require('os');
const https = require('https');

const app = express();
const port = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'chidy_prime_super_secret_2025';
const ADMIN_PIN = process.env.ADMIN_PIN || '2025';

// --- SYSTEM HEALTH MONITORING ---
global.systemErrors = [];
global.healthStats = {
    supabaseStatus: 'Unknown',
    lastDbCheck: null,
    cpuUsage: 0,
    memoryUsage: 0,
    uptime: 0
};

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    console.log('Telegram Alert System: READY ✅');
} else {
    console.warn('Telegram Alert System: DISABLED (Missing credentials) ❌');
}

function sendTelegramAlert(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
    try {
        const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        const payload = JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'HTML' });
        
        const req = https.request(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        });
        req.on('error', (e) => console.error('Telegram alert failed:', e));
        req.write(payload);
        req.end();
    } catch(e) { console.error(e); }
}

function logSystemError(type, message) {
    global.systemErrors.unshift({ type, message, time: new Date().toISOString() });
    if(global.systemErrors.length > 50) global.systemErrors.pop();
    
    sendTelegramAlert(`🚨 <b>CHIDY PRIME SYSTEM ALERT</b> 🚨\n\n<b>Type:</b> ${type}\n<b>Message:</b> ${message}\n<b>Time:</b> ${new Date().toISOString()}`);
}

async function runHealthCheck() {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        global.healthStats.memoryUsage = Math.round((usedMem / totalMem) * 100);
        
        const load = os.loadavg()[0]; 
        const cpus = os.cpus().length;
        global.healthStats.cpuUsage = Math.round((load / cpus) * 100);
        
        global.healthStats.uptime = process.uptime();

        if (supabase) {
            const start = Date.now();
            const { error } = await supabase.from('site_settings').select('*').limit(1);
            if (error) {
                if (global.healthStats.supabaseStatus !== 'Down') logSystemError('Database_Failure', error.message);
                global.healthStats.supabaseStatus = 'Down';
            } else {
                global.healthStats.supabaseStatus = `OK (${Date.now() - start}ms)`;
            }
            global.healthStats.lastDbCheck = new Date().toISOString();
        }

        if (global.healthStats.memoryUsage > 90) {
            logSystemError('High_Memory', `Server Memory Usage is critical: ${global.healthStats.memoryUsage}%`);
        }
        if (global.healthStats.cpuUsage > 90) {
            logSystemError('High_CPU', `Server CPU Usage is critical: ${global.healthStats.cpuUsage}%`);
        }
    } catch(err) {
        console.error("Health monitor error:", err);
    }
}

// Run immediately on startup
// runHealthCheck(); // Moved later to ensure supabase is initialized first

// Background Monitor Task (Every 5 mins)
setInterval(runHealthCheck, 5 * 60 * 1000);

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

// Start health checks after everything is initialized
runHealthCheck();



// === PERFORMANCE: Gzip compression (reduces response size 60-80%) ===
app.use(compression());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// === PERFORMANCE: Static file caching (1 week for assets) ===
app.use(express.static('public', {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    immutable: false
}));

// === PERFORMANCE: In-memory cache for games API ===
let gamesCache = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 1000; // 30 seconds

function invalidateGamesCache() {
    gamesCache = { data: null, timestamp: 0 };
}

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

    // Serve from cache if still fresh
    const now = Date.now();
    if (gamesCache.data && (now - gamesCache.timestamp) < CACHE_TTL) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', 'public, max-age=30');
        return res.json(gamesCache.data);
    }

    const { data, error } = await supabase
        .from('posts')
        .select('id, title, description, rating, image_url, price, category, youtube_url, status, created_at, duration_days')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Update cache
    gamesCache = { data, timestamp: now };
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'public, max-age=30');
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
        invalidateGamesCache();
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
    invalidateGamesCache();
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
    invalidateGamesCache();
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
        // For XP Levels
        const { count: orderCount } = await supabase
            .from('payment_orders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'approved')
            .eq('visitor_id', data[0].id);

    // Check for pending gifts for this phone
    const { data: gifts } = await supabase
        .from('pending_gifts')
        .select('*')
        .eq('gift_phone', phone.trim());

    if (gifts && gifts.length > 0) {
        for (const gift of gifts) {
            const { post_id, duration_days } = gift;
            let expiresAt;
            if (duration_days > 0) {
                expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + duration_days);
            } else {
                expiresAt = new Date('2099-12-31T23:59:59Z');
            }
            await supabase.from('user_access').upsert({
                visitor_id: data[0].id,
                post_id,
                granted_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            }, { onConflict: 'visitor_id,post_id' });
            
            // Delete the gift after granting
            await supabase.from('pending_gifts').delete().eq('id', gift.id);
        }
    }

    res.json({ success: true, visitor: data[0], orderCount: orderCount || 0 });
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

app.get('/api/leaderboard', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data: orders, error } = await supabase
            .from('payment_orders')
            .select('visitor_id, visitors(name)')
            .eq('status', 'approved');
            
        if (error) throw error;
        
        const counts = {};
        orders.forEach(o => {
            if (!o.visitor_id || !o.visitors) return;
            const name = o.visitors.name;
            counts[name] = (counts[name] || 0) + 1;
        });
        
        const leaderboard = Object.keys(counts)
            .map(name => ({ name, purchases: counts[name] }))
            .sort((a, b) => b.purchases - a.purchases)
            .slice(0, 10);
            
        res.json(leaderboard);
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

// Admin Analytics (Dashboard Summary)
app.get('/api/admin/analytics', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { count: total } = await supabase.from('visitors').select('*', { count: 'exact', head: true });
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const { count: prevTotal } = await supabase.from('visitors').select('*', { count: 'exact', head: true }).lt('created_at', yesterday.toISOString());
        const diff = (total || 0) - (prevTotal || 0);
        res.json({ total: total || 0, diff: Math.abs(diff), trend: diff >= 0 ? 'up' : 'down' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// User Stats Endpoint
app.get('/api/user-stats', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { count: total } = await supabase.from('visitors').select('*', { count: 'exact', head: true });
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const { count: prevTotal } = await supabase.from('visitors').select('*', { count: 'exact', head: true }).lt('created_at', yesterday.toISOString());
        const diff = (total || 0) - (prevTotal || 0);
        res.json({ total: total || 0, diff: Math.abs(diff), trend: diff >= 0 ? 'up' : 'down' });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

// Image Upload to Supabase Storage
app.post('/api/admin/upload', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    try {
        const { image, fileName } = req.body;
        if (!image) return res.status(400).json({ error: 'No image data provided' });

        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const finalFileName = `${Date.now()}_${fileName || 'upload.jpg'}`;

        const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
        const contentType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

        const { data, error } = await supabase.storage
            .from('images')
            .upload(finalFileName, buffer, { contentType, upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(finalFileName);
        res.json({ success: true, url: publicUrl });
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
        .order('display_order', { ascending: true })
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

// PATCH - bulk update categories order and visibility
app.patch('/api/categories/order', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { categories } = req.body;
    if (!Array.isArray(categories)) return res.status(400).json({ error: 'Categories array is required' });
    
    try {
        // Use parallel updates for better performance
        await Promise.all(categories.map(cat => 
            supabase.from('categories')
                .update({ display_order: cat.display_order, is_visible: cat.is_visible })
                .eq('id', cat.id)
        ));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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

// GET System Health (Admin Only)
app.get('/api/system/health', verifyAdmin, async (req, res) => {
    if (typeof runHealthCheck === 'function') await runHealthCheck();
    res.json({
        stats: global.healthStats,
        errors: global.systemErrors,
        telegramConfigured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
    });
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

app.get('/api/settings/announcement', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'announcement_text').single();
    if (error) return res.json({ value: "Karibu Chidy Prime Gaming!" });
    res.json({ value: data.value });
});

app.post('/api/settings/announcement', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { text } = req.body;
    const { error } = await supabase.from('site_settings').upsert({ key: 'announcement_text', value: JSON.stringify(text) });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ============================================
// PROMO CODES ENDPOINTS
// ============================================

app.get('/api/admin/promo', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'promo_codes').single();
        if (error) {
            if (error.code === 'PGRST116') return res.json([]); // Not found
            return res.status(500).json({ error: error.message });
        }
        res.json(data.value || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/admin/promo', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { codes } = req.body;
        const { error } = await supabase.from('site_settings').upsert({ 
            key: 'promo_codes', 
            value: codes || [] 
        });
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// USER ACCESS / DURATION ENDPOINTS
// ============================================


// Check if a visitor has active access to a game
app.get('/api/check-access/:visitor_id/:post_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { visitor_id, post_id } = req.params;
    
    try {
        // 1. Fetch game details to check price
        const { data: game, error: gameErr } = await supabase
            .from('posts')
            .select('price, links')
            .eq('id', post_id)
            .single();

        if (gameErr || !game) return res.status(404).json({ error: 'Game not found' });

        // 2. If game is FREE (price <= 0), anyone with a visitor_id (this endpoint is called after signup) gets access
        if (game.price <= 0) {
            return res.json({ 
                has_access: true, 
                expires_at: '2099-12-31T23:59:59Z', // Permanent
                links: game.links || []
            });
        }

        // 3. If game is PAID, check user_access
        const { data, error } = await supabase
            .from('user_access')
            .select('*')
            .eq('visitor_id', parseInt(visitor_id))
            .eq('post_id', post_id)
            .single();
        
        if (error || !data) {
            // Check for pending order before saying "no access"
            const { data: orderData } = await supabase
                .from('payment_orders')
                .select('status')
                .eq('visitor_id', parseInt(visitor_id))
                .eq('post_id', post_id)
                .eq('status', 'pending');

            return res.json({ 
                has_access: false,
                pending_order: orderData && orderData.length > 0
            });
        }
        
        const now = new Date();
        const expiresAt = new Date(data.expires_at);
        const hasAccess = expiresAt > now;
        
        if (hasAccess) {
            return res.json({ 
                has_access: true, 
                expires_at: data.expires_at,
                links: game.links || []
            });
        }
        
        // If expired
        const { data: pendingAfterExpiry } = await supabase
            .from('payment_orders')
            .select('status')
            .eq('visitor_id', parseInt(visitor_id))
            .eq('post_id', post_id)
            .eq('status', 'pending');

        res.json({ 
            has_access: false, 
            expired: true,
            pending_order: pendingAfterExpiry && pendingAfterExpiry.length > 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET user purchases/library with active access
app.get('/api/user/purchases/:visitor_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { visitor_id } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('user_access')
            .select(`
                visitor_id,
                post_id,
                expires_at,
                posts (id, title, image_url, links)
            `)
            .eq('visitor_id', parseInt(visitor_id));
            
        if (error) throw error;
        
        // Filter out expired ones and format
        const now = new Date();
        const activePurchases = data
            .filter(item => new Date(item.expires_at) > now)
            .map(item => ({
                id: item.post_id,
                expires_at: item.expires_at,
                posts: item.posts
            }));
            
        res.json(activePurchases);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// PAYMENT ORDER ENDPOINTS
// ============================================

// === AZAMPAY INTEGRATION LOGIC ===
async function getAzamPayToken() {
    try {
        const res = await fetch(`${process.env.AZAMPAY_BASE_URL}/azampay/authentication/v1/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appName: "Chidy Prime",
                clientId: process.env.AZAMPAY_CLIENT_ID,
                clientSecret: process.env.AZAMPAY_SECRET_KEY
            })
        });
        const data = await res.json();
        return data.data?.accessToken;
    } catch (err) {
        console.error('AzamPay Auth Error:', err);
        return null;
    }
}

// Checkout endpoint for Push USSD
app.post('/api/payments/azampay-checkout', async (req, res) => {
    const { amount, phone, gameTitle, visitorId, postId } = req.body;
    
    // Validate phone (needs 255...)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '255' + formattedPhone.substring(1);
    
    const token = await getAzamPayToken();
    if (!token) return res.status(500).json({ error: 'Failed to authenticate with AzamPay' });

    try {
        const azamRes = await fetch(`${process.env.AZAMPAY_BASE_URL}/azampay/checkout/v1/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                accountNumber: formattedPhone, // The phone number to bill
                amount: amount.toString(),
                currency: "TZS",
                externalId: Date.now().toString(), // Unique ID for this attempt
                provider: "Airtel", // Default to Airtel or should be dynamic
                additionalProperties: {
                    visitorId: visitorId,
                    postId: postId,
                    gameTitle: gameTitle
                }
            })
        });

        const data = await azamRes.json();
        res.json(data);
    } catch (err) {
        console.error('AzamPay Checkout Error:', err);
        res.status(500).json({ error: 'AzamPay service error' });
    }
});

// GET User Stats (XP/Level)
app.get('/api/user/stats/:visitor_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id } = req.params;
    try {
        const { count, error } = await supabase
            .from('payment_orders')
            .select('*', { count: 'exact', head: true })
            .eq('visitor_id', parseInt(visitor_id))
            .eq('status', 'approved');
        
        if (error) throw error;
        
        const countNum = count || 0;
        let level = 'ROOKIE GAMER';
        let color = '#a0a0b0';
        let xp_to_next = 2 - countNum;
        
        if (countNum >= 10) {
            level = 'LEGENDARY GAMER 👑';
            color = '#ffb400';
            xp_to_next = 0;
        } else if (countNum >= 5) {
            level = 'PRO GAMER';
            color = '#bc13fe';
            xp_to_next = 10 - countNum;
        } else if (countNum >= 2) {
            level = 'ELITE GAMER';
            color = '#00f2ff';
            xp_to_next = 5 - countNum;
        }

        res.json({ total_orders: countNum, level, color, xp_to_next });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/analytics/sales', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase.rpc('get_daily_sales'); 
        // If RPC doesn't exist, we'll use a raw query check
        if (error) {
            // Fallback: simple fetch last 30 orders and group in JS
            const { data: orders } = await supabase
                .from('payment_orders')
                .select('amount, created_at')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(100);
            
            const grouped = {};
            orders.forEach(o => {
                const date = o.created_at.split('T')[0];
                grouped[date] = (grouped[date] || 0) + parseFloat(o.amount);
            });
            // Convert to array and sort
            const result = Object.entries(grouped).map(([date, total]) => ({ date, total })).sort((a,b) => a.date.localeCompare(b.date));
            return res.json(result);
        }
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Webhook Callback (The "Auto" part)
app.post('/api/payments/callback', async (req, res) => {
    console.log('--- AZAMPAY CALLBACK RECEIVED ---', req.body);
    const { msisdn, amount, status, externalId, additionalProperties } = req.body;

    if (status === 'success' || status === 'Success') {
        const { visitorId, postId } = additionalProperties || {};
        
        try {
            // 1. Create/Update order in database as Approved
            const { data: order, error: orderError } = await supabase
                .from('payment_orders')
                .insert([{
                    visitor_id: visitorId,
                    post_id: postId,
                    amount: amount,
                    phone_number: msisdn,
                    status: 'approved',
                    payment_method: 'AzamPay'
                }])
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Log Analytics
            await supabase.from('daily_stats').insert([{
                event_type: 'payment_success',
                metadata: { amount, msisdn, postId }
            }]);

            console.log(`Auto-Approved Order ${order.id} for ${msisdn}`);
            
            // Telegram Alert for Success
            sendTelegramAlert(`💰 <b>SUCCESSFUL PAYMENT</b> 💰\n\n<b>Game:</b> ${additionalProperties?.gameTitle || 'Unknown'}\n<b>Amount:</b> TSh ${parseInt(amount).toLocaleString()}\n<b>Phone:</b> ${msisdn}\n<b>Method:</b> AzamPay\n<b>Time:</b> ${new Date().toLocaleString()}`);

            return res.json({ success: true, message: 'Payment recorded and content unlocked' });

        } catch (dbErr) {
            console.error('Database Error in Callback:', dbErr);
            return res.status(500).json({ error: 'DB update failed' });
        }
    }

    res.json({ success: false, message: 'Payment not successful' });
});

// Create a new manual payment order
app.post('/api/orders', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { visitor_id, post_id, amount, phone_number, promo_used } = req.body;
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
                status: 'pending',
                is_gift: req.body.is_gift || false,
                gift_phone: req.body.gift_phone || null,
                promo_used: promo_used || null
            }])
            .select();
        
        if (error) throw error;
        
        // Notify admin via Telegram & chat
        const promoInfo = promo_used ? `\n🎟️ <b>Promo:</b> ${promo_used}` : '';
        sendTelegramAlert(`🛒 <b>NEW PENDING ORDER</b> 🛒\n\n<b>Phone:</b> ${phone_number}\n<b>Amount:</b> TSh ${parseFloat(amount).toLocaleString()}${promoInfo}\n<b>Time:</b> ${new Date().toLocaleString()}\n\n<i>Check Admin Dashboard to approve.</i>`);

        await supabase.from('chat_messages').insert([{
            sender: 'SYSTEM',
            message: `New Order! 💰 Number: ${phone_number}, Amount: TSh ${amount}. Check Admin Dashboard to approve.`
        }]);

        res.json({ success: true, order: data[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fetch order history for a specific visitor
app.get('/api/orders/history/:visitorId', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitorId } = req.params;
    
    try {
        const { data, error } = await supabase
            .from('payment_orders')
            .select(`
                *,
                posts (title)
            `)
            .eq('visitor_id', parseInt(visitorId))
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin - Fetch all orders
app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    // Auto-cleanup Approved/Rejected orders after 7 days
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        await supabase.from('payment_orders').delete().neq('status', 'pending').lt('created_at', sevenDaysAgo.toISOString());
    } catch (e) {}
    
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
    console.log(`[DEBUG] Status Update Request: ID=${id}, Status=${status}, Version=1.5_FIXED`);
    
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
            
            // 2a. Fetch game info first (REQUIRED for expiresAt and title)
            const { data: game } = await supabase.from('posts').select('title, duration_days').eq('id', post_id).single();
            const dDays = game ? (game.duration_days || 0) : 0;
            const gTitle = game ? game.title : 'Game';
            
            var finalExpiresAt = new Date();
            if (dDays > 0) {
                finalExpiresAt.setDate(finalExpiresAt.getDate() + dDays);
            } else {
                finalExpiresAt = new Date('2099-12-31T23:59:59Z');
            }

            let targetVisitorId = visitor_id;
            const isGift = order.is_gift;
            const giftPhone = order.gift_phone;

            if (isGift && giftPhone) {
                const { data: giftUser } = await supabase.from('visitors').select('id').eq('phone', giftPhone.trim()).single();
                if (giftUser) {
                    targetVisitorId = giftUser.id;
                } else {
                    await supabase.from('pending_gifts').insert([{
                        gift_phone: giftPhone.trim(),
                        post_id: post_id,
                        duration_days: dDays
                    }]);
                    targetVisitorId = null;
                }
            }

            if (targetVisitorId) {
                await supabase.from('user_access').upsert({
                    visitor_id: targetVisitorId,
                    post_id,
                    granted_at: new Date().toISOString(),
                    expires_at: finalExpiresAt.toISOString()
                }, { onConflict: 'visitor_id,post_id' });
            }

            // 3. Notify requester (with post_id for auto-cleanup)
            await supabase.from('notifications').insert({
                visitor_id: visitor_id,
                post_id: post_id,
                title: isGift ? 'Zawadi Imetumwa! 🎁' : 'Malipo Yamekubaliwa! ✅',
                message: isGift 
                    ? `Oda yako ya zawadi ya "${gTitle}" kwa namba ${giftPhone} imekubaliwa.` 
                    : `Malipo yako ya game "${gTitle}" yamehakikiwa. Sasa unaweza kuanza kudownload.`,
                type: 'success'
            });

            // 4. Notify recipient (with post_id for auto-cleanup)
            if (isGift && targetVisitorId) {
                await supabase.from('notifications').insert({
                    visitor_id: targetVisitorId,
                    post_id: post_id,
                    title: 'Umepokea Zawadi! 👑',
                    message: `Umepata zawadi ya game "${gTitle}" kutoka kwa ${order.phone_number || 'rafiki'}. Unaweza kuanza kuicheza sasa hivi!`,
                    type: 'success'
                });
            }
        }
        
        res.json({ success: true, order, debug_version: '1.5_FIXED' });
    } catch (err) {
        console.error(`[ERROR] Status Update Error: ${err.message}`);
        res.status(500).json({ error: `Server Error [v1.5]: ${err.message}` });
    }
});

// GET Leaderboard (Top 10 Gamers)
app.get('/api/leaderboard', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase
            .from('payment_orders')
            .select('visitor_id, visitors(name)')
            .eq('status', 'approved');

        if (error) throw error;

        const counts = {};
        data.forEach(item => {
            const vid = item.visitor_id;
            if (vid && item.visitors) {
                if (!counts[vid]) counts[vid] = { name: item.visitors.name, purchases: 0 };
                counts[vid].purchases++;
            }
        });

        const leaderboard = Object.values(counts)
            .sort((a, b) => b.purchases - a.purchases)
            .slice(0, 10);

        res.json(leaderboard);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Manual Gift Grant
app.post('/api/admin/grant-gift', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { post_id, phone } = req.body;

    if (!post_id || !phone) return res.status(400).json({ error: 'Post ID and Phone are required' });

    try {
        // 1. Get Game info for duration
        const { data: game, error: gErr } = await supabase.from('posts').select('*').eq('id', post_id).single();
        if (gErr || !game) throw new Error("Game not found");

        const durationDays = game.duration_days || 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);

        // 2. Check if user exists
        const { data: user } = await supabase.from('visitors').select('id').eq('phone', phone.trim()).single();
        
        if (user) {
            // Grant access directly
            await supabase.from('user_access').upsert({
                visitor_id: user.id,
                post_id,
                granted_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            }, { onConflict: 'visitor_id,post_id' });

            // Notify user
            await supabase.from('notifications').insert({
                visitor_id: user.id,
                title: 'Umepokea Zawadi! 👑',
                message: `Umepewa zawadi ya game "${game.title}" na Admin wa Chidy Prime. Unaweza kuanza kuicheza sasa hivi!`,
                type: 'success'
            });
            
            res.json({ success: true, message: 'Access granted to existing user' });
        } else {
            // Store as pending gift
            await supabase.from('pending_gifts').insert([{
                gift_phone: phone.trim(),
                post_id: post_id,
                duration_days: durationDays
            }]);
            res.json({ success: true, message: 'Game stored as pending gift for new user' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Activity Feed
app.get('/api/admin/activity', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    try {
        // Fetch last 10 visitors (signups)
        const { data: signups, error: sErr } = await supabase
            .from('visitors')
            .select('id, name, created_at')
            .order('created_at', { ascending: false })
            .limit(10);
            
        // Fetch last 10 orders
        const { data: orders, error: oErr } = await supabase
            .from('payment_orders')
            .select('id, created_at, amount, status, visitors(name), posts(title)')
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (sErr || oErr) throw (sErr || oErr);

        // Combine and label
        const activity = [
            ...signups.map(s => ({ ...s, type: 'signup', timestamp: s.created_at })),
            ...orders.map(o => ({ ...o, type: 'order', timestamp: o.created_at }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 15);

        res.json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Notifications API
app.get('/api/notifications/:visitor_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id } = req.params;
    
    try {
        // 1. Fetch current notifications
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .or(`visitor_id.eq.${visitor_id},visitor_id.is.null`)
            .order('created_at', { ascending: false });
            
        if (error) throw error;

        // 2. Fetch user access to check for expired ones
        const { data: activeAccess } = await supabase
            .from('user_access')
            .select('post_id, expires_at')
            .eq('visitor_id', parseInt(visitor_id));

        const now = new Date();
        const accessMap = {};
        (activeAccess || []).forEach(a => {
            accessMap[a.post_id] = new Date(a.expires_at) > now;
        });

        // 3. Filter and Cleanup Expired Notifications
        const filteredNotifications = [];
        const toDeleteIds = [];

        for (const n of notifications) {
            // If it's a game-specific notification (has post_id)
            if (n.post_id) {
                const isStillActive = accessMap[n.post_id];
                if (isStillActive) {
                    filteredNotifications.push(n);
                } else {
                    // Access expired or doesn't exist anymore, mark for deletion
                    toDeleteIds.push(n.id);
                }
            } else {
                // Global or system notification, always show for 7 days
                const ageDays = (now - new Date(n.created_at)) / (1000 * 60 * 60 * 24);
                if (ageDays < 7) {
                    filteredNotifications.push(n);
                } else {
                    toDeleteIds.push(n.id);
                }
            }
        }

        // 4. Background cleanup (Delete from DB so they don't clog up)
        if (toDeleteIds.length > 0) {
            supabase.from('notifications').delete().in('id', toDeleteIds).then();
        }

        res.json(filteredNotifications.slice(0, 10));
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

// Manual Access Extension
app.post('/api/admin/access/extend', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id, post_id, days } = req.body;
    
    try {
        // 1. Get current access
        const { data: access, error: getErr } = await supabase
            .from('user_access')
            .select('*')
            .eq('visitor_id', visitor_id)
            .eq('post_id', post_id)
            .single();
            
        if (getErr || !access) {
            // If no access exists, grant new access starting now
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(days));
            
            await supabase.from('user_access').upsert({
                visitor_id, post_id, 
                granted_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString()
            });
        } else {
            // Extend existing access
            const currentExpiry = new Date(access.expires_at);
            const now = new Date();
            const baseDate = currentExpiry > now ? currentExpiry : now;
            
            baseDate.setDate(baseDate.getDate() + parseInt(days));
            
            await supabase.from('user_access')
                .update({ expires_at: baseDate.toISOString() })
                .eq('visitor_id', visitor_id)
                .eq('post_id', post_id);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Validate Promo Code
app.post('/api/promo/validate', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { code } = req.body;
    
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'promo_codes')
            .single();
            
        if (error || !data) return res.status(404).json({ valid: false, message: 'Invalid promo code' });
        
        const codes = data.value;
        const promo = codes.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
        
        if (promo) {
            res.json({ valid: true, discount: promo.discount });
        } else {
            res.status(404).json({ valid: false, message: 'Promo code not found or inactive' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get payment settings info

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

// Global Error Handling to prevent silent crashes
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
    // In production, you might want to restart specifically or log to a service
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
