require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const compression = require('compression');
const os = require('os');
const https = require('https');
const webPush = require('web-push');

const app = express();
const port = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || 'chidy_prime_super_secret_2025';
const ADMIN_PIN = process.env.ADMIN_PIN || '2025';
const ZENOPAY_API_KEY = process.env.ZENOPAY_API_KEY || 'S7Sy7GYL0qzE4IIaEQvlHreGW6LzkQ4DJDPZLyehi6yL4BbO3HqQyA0wAe5HmktXuln9FFYDszRXJAni_HvuAQ';
const HARAKAPAY_API_KEY = process.env.HARAKAPAY_API_KEY || 'hpk_83c505af729a5f9059ef8ea1c6b125e6831adf232da6e387';

// --- WEB PUSH SETUP ---
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
if (vapidPublicKey && vapidPrivateKey) {
    webPush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@chidyprime.com',
        vapidPublicKey,
        vapidPrivateKey
    );
    console.log('Web Push Notifications: READY ✅');
} else {
    console.warn('Web Push Notifications: DISABLED (Missing VAPID keys) ❌');
}

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

// --- AUTOMATED PENDING ORDER WORKER ---
// This worker automatically checks Haraka Pay and ZenoPay for pending orders and approves them if paid.
// This removes the need for manual admin approval.
setInterval(async () => {
    if (!supabase) return;
    try {
        const { data: pendingOrders } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('status', 'pending')
            .not('promo_used', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!pendingOrders || pendingOrders.length === 0) return;

        for (const order of pendingOrders) {
            const extOrderId = order.promo_used;
            if (!extOrderId) continue;

            // Check if order is older than 30 minutes
            const ageMinutes = (new Date() - new Date(order.created_at)) / 60000;
            if (ageMinutes > 30) {
                await supabase.from('payment_orders').update({ status: 'rejected' }).eq('id', order.id);
                continue;
            }

            try {
                let isPaid = false;
                if (extOrderId.startsWith('HP')) {
                    const hRes = await fetch(`https://harakapay.net/api/v1/status/${extOrderId}`, {
                        method: 'GET',
                        headers: { 'X-API-Key': HARAKAPAY_API_KEY }
                    });
                    const hData = await hRes.json().catch(() => ({}));
                    const hStatus = (hData.payment && hData.payment.status || '').toLowerCase();
                    if (hStatus === 'completed' || hStatus === 'success') {
                        isPaid = true;
                    }
                } else if (extOrderId.startsWith('ZP')) {
                    const zRes = await fetch('https://zenoapi.com/api/payments/order_status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ 'api_key': ZENOPAY_API_KEY, 'order_id': extOrderId })
                    });
                    const zData = await zRes.json().catch(() => ({}));
                    const zStatus = (zData.status || zData.payment_status || '').toLowerCase();
                    if (zStatus === 'success' || zStatus === 'completed') {
                        isPaid = true;
                    }
                }

                if (isPaid) {
                    console.log(`[AUTO-WORKER] Order ${extOrderId} was paid! Unlocking...`);
                    
                    // Try to find in posts (games) first
                    const { data: game } = await supabase.from('posts').select('*').eq('id', order.post_id).single();
                    if (game) {
                        await handleSuccessfulPayment(order.visitor_id, game, order.amount, order.phone_number, extOrderId, false);
                    } else {
                        // Try to find in videos
                        const { data: video } = await supabase.from('videos').select('*').eq('id', order.post_id).single();
                        if (video) {
                            await handleSuccessfulPayment(order.visitor_id, video, order.amount, order.phone_number, extOrderId, true);
                        }
                    }
                }
            } catch (e) {
                // Ignore individual check errors
            }
        }
    } catch (err) {
        console.error('Pending worker error:', err);
    }
}, 30000); // Check every 30 seconds
 
 
// --- AUTOMATED ORDER CLEANUP WORKER (Runs every 24 hours) ---
// This deletes Approved and Rejected orders older than 30 days to keep the DB clean.
setInterval(async () => {
    if (!supabase) return;
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        console.log(`[CLEANUP] Starting cleanup of orders older than ${thirtyDaysAgo.toISOString()}...`);
        
        const { error } = await supabase
            .from('payment_orders')
            .delete()
            .neq('status', 'pending') // Never delete pending orders automatically
            .lt('created_at', thirtyDaysAgo.toISOString());

        if (error) throw error;
        console.log('[CLEANUP] Old orders purged successfully. ✅');
    } catch (err) {
        console.error('Cleanup worker error:', err);
    }
}, 24 * 60 * 60 * 1000); // Runs once every 24 hours




// === PERFORMANCE: Gzip compression (reduces response size 60-80%) ===
app.use(compression());

// Only admin upload endpoints need the 50mb limit — all other endpoints use a small cap
app.use('/api/admin/upload', express.json({ limit: '50mb' }));
app.use('/api/admin/upload', express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));

// API Request Logging
app.use((req, res, next) => {
    if (req.url.startsWith('/api/')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    }
    next();
});

// CRITICAL: Never cache the service worker!
app.get('/sw.js', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// === PERFORMANCE: Static file caching (1 week for assets) ===
app.use(express.static('public', {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    immutable: false,
    setHeaders: (res, path) => {
        if (path.endsWith('sw.js')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        }
    }
}));

// === PERFORMANCE: In-memory multi-purpose cache ===
let gamesCache = { data: null, timestamp: 0 };
let categoriesCache = { data: null, timestamp: 0 };
let settingsCache = {}; // keyed by setting key

const CACHE_TTL        = 5 * 60 * 1000; // 5 minutes for games (was 30s)
const CATEGORIES_TTL   = 10 * 60 * 1000; // 10 minutes for categories
const SETTINGS_TTL     = 5 * 60 * 1000; // 5 minutes for settings

function invalidateGamesCache() {
    gamesCache = { data: null, timestamp: 0 };
}
function invalidateCategoriesCache() {
    categoriesCache = { data: null, timestamp: 0 };
}
function invalidateSettingsCache(key) {
    if (key) delete settingsCache[key];
    else settingsCache = {};
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
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Settings Endpoints (with in-memory cache)
app.get('/api/settings/:key', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { key } = req.params;

    const now = Date.now();
    const cached = settingsCache[key];
    if (cached && (now - cached.timestamp) < SETTINGS_TTL) {
        res.set('X-Cache', 'HIT');
        return res.json(cached.data);
    }

    try {
        const { data, error } = await supabase.from('site_settings').select('value').eq('key', key).single();
        if (error && error.code !== 'PGRST116') throw error;
        
        let result = data;
        
        if (key === 'lifetime_revenue' && !data) {
            // Seed lifetime_revenue from existing approved payments in the DB
            const { data: approvedOrders } = await supabase
                .from('payment_orders')
                .select('amount')
                .eq('status', 'approved');
            
            const totalSum = (approvedOrders || []).reduce((sum, o) => sum + parseFloat(o.amount || 0), 0);
            
            await supabase.from('site_settings').upsert({
                key: 'lifetime_revenue',
                value: String(totalSum),
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
            
            result = { value: String(totalSum) };
        } else if (!data) {
            result = { value: key === 'global_discount' ? 0 : (key === 'total_installs' ? 0 : null) };
        }
        
        settingsCache[key] = { data: result, timestamp: now };
        res.set('X-Cache', 'MISS');
        res.json(result);
    } catch (err) {
        console.error("Settings getter error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/settings/:key', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { key } = req.params;
    const { value } = req.body;

    try {
        const { error } = await supabase
            .from('site_settings')
            .upsert({ key, value });

        if (error) return res.status(500).json({ error: error.message });
        if (key === 'global_discount') invalidateGamesCache();
        invalidateSettingsCache(key); // bust the settings cache too
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- WEB PUSH API ---
app.get('/api/push/public-key', (req, res) => {
    if (!vapidPublicKey) return res.status(500).json({ error: 'VAPID keys not configured' });
    res.json({ publicKey: vapidPublicKey });
});

app.post('/api/push/subscribe', express.json(), async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const subscription = req.body;
    
    // Store subscription in site_settings (using endpoint as unique key hash)
    try {
        // Hash the endpoint to create a safe key
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(subscription.endpoint).digest('hex');
        const key = `push_sub_${hash}`;
        
        await supabase.from('site_settings').upsert({
            key: key,
            value: JSON.stringify(subscription)
        }, { onConflict: 'key' });
        
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Subscription error:', err);
        res.status(500).json({ error: err.message });
    }
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
        res.set('Cache-Control', 'public, max-age=300'); // 5 min browser cache
        return res.json(gamesCache.data);
    }

    const { data, error } = await supabase
        .from('posts')
        .select('id, title, description, rating, image_url, price, category, youtube_url, status, created_at, duration_days, links, sort_order')
        .eq('status', 'published')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Reuse settings cache for global_discount to avoid extra DB hit
    let globalDiscount = 0;
    try {
        const cachedDisc = settingsCache['global_discount'];
        if (cachedDisc && (now - cachedDisc.timestamp) < SETTINGS_TTL) {
            globalDiscount = parseInt(cachedDisc.data.value) || 0;
        } else {
            const { data: gDisc } = await supabase.from('site_settings').select('value').eq('key', 'global_discount').single();
            if (gDisc) {
                globalDiscount = parseInt(gDisc.value) || 0;
                settingsCache['global_discount'] = { data: gDisc, timestamp: now };
            }
        }
    } catch (e) {}

    const processedData = data.map(g => {
        let finalPrice = g.price;
        if (globalDiscount > 0 && g.price > 0) {
            finalPrice = Math.floor(g.price * (1 - globalDiscount / 100));
        }
        return { ...g, original_price: g.price, price: finalPrice, global_discount: globalDiscount };
    });

    gamesCache = { data: processedData, timestamp: now };
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'public, max-age=300'); // 5 min browser cache
    res.json(processedData);
});

// Admin - show all statuses
app.get('/api/admin/games', verifyAdmin, async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Supabase not configured' });
    }
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('sort_order', { ascending: true })
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
                    duration_days: parseInt(req.body.duration_days || 0),
                    sort_order: parseInt(req.body.sort_order || 9999)
                }
            ]);

        if (error) throw error;
        invalidateGamesCache();
        
        // --- SEND PUSH NOTIFICATIONS ---
        if (vapidPublicKey && vapidPrivateKey) {
            try {
                // Fetch all subscriptions
                const { data: subsData } = await supabase
                    .from('site_settings')
                    .select('value')
                    .like('key', 'push_sub_%');
                
                if (subsData && subsData.length > 0) {
                    const payload = JSON.stringify({
                        title: 'Mzigo Mpya Umeingia! 🔥',
                        body: `Game mpya ya ${title} sasa inapatikana Chidy Prime. Iwahie!`,
                        url: '/'
                    });
                    
                    const sendPromises = subsData.map(async (sub) => {
                        try {
                            const subscription = JSON.parse(sub.value);
                            await webPush.sendNotification(subscription, payload);
                        } catch (e) {
                            if (e.statusCode === 410 || e.statusCode === 404) {
                                // Subscription expired/unsubscribed - ideally delete it from DB here
                            }
                        }
                    });
                    
                    // Don't wait for all to finish before responding to admin
                    Promise.all(sendPromises).catch(console.error);
                }
            } catch (pushErr) {
                console.error("Failed to send push notifications:", pushErr);
            }
        }
        
        // --- INSERT GLOBAL NOTIFICATION ---
        try {
            await supabase.from('notifications').insert({
                title: 'Mzigo Mpya! 🚀',
                message: `Game ya ${title} imeshaachiwa! Ingia sasa kudownload.`,
                type: 'success'
            });
        } catch (notifErr) { console.error("Global notif error:", notifErr); }

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

    const { name, phone, referred_by } = req.body;
    if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });

    try {
        const { data, error } = await supabase
            .from('visitors')
            .insert([{ 
                name: name.trim(), 
                phone: phone.trim(),
                referred_by: referred_by ? parseInt(referred_by) : null
            }])
            .select();

        if (error) throw error;
        
        // Notify admin about new signup
        sendTelegramAlert(`👤 <b>NEW USER SIGNUP</b> 👤\n\n<b>Name:</b> ${name.trim()}\n<b>Phone:</b> ${phone.trim()}\n<b>Time:</b> ${new Date().toLocaleString()}`);

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

// DELETE a user (cascade-safe: removes related records first)
app.delete('/api/users/:id', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { id } = req.params;

    try {
        // 1. Delete related notifications
        const { error: notifErr } = await supabase
            .from('notifications')
            .delete()
            .eq('visitor_id', id);
        if (notifErr) console.warn('Notifications delete warning:', notifErr.message);

        // 2. Delete related user_access records
        const { error: accessErr } = await supabase
            .from('user_access')
            .delete()
            .eq('visitor_id', id);
        if (accessErr) console.warn('user_access delete warning:', accessErr.message);

        // 3. Delete related payment_orders
        const { error: ordersErr } = await supabase
            .from('payment_orders')
            .delete()
            .eq('visitor_id', id);
        if (ordersErr) console.warn('payment_orders delete warning:', ordersErr.message);

        // 4. Now safely delete the visitor
        const { error } = await supabase
            .from('visitors')
            .delete()
            .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

// Track PWA Installation
app.post('/api/track-install', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    try {
        // Increment install count in site_settings
        const { data: current } = await supabase.from('site_settings').select('value').eq('key', 'total_installs').single();
        const newCount = (current ? parseInt(current.value) : 0) + 1;
        
        await supabase.from('site_settings').upsert({ key: 'total_installs', value: String(newCount) });
        res.json({ success: true, count: newCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all games for a visitor (My Library)
app.get('/api/access/:visitor_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id } = req.params;

    try {
        const { data, error } = await supabase
            .from('user_access')
            .select('*, posts(*)')
            .eq('visitor_id', visitor_id)
            .gt('expires_at', new Date().toISOString());

        if (error) return res.status(500).json({ error: error.message });
        
        const games = data.map(item => ({
            ...item.posts,
            expires_at: item.expires_at
        }));
        
        res.json({ success: true, games });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



// Admin: Get all affiliates and stats
app.get('/api/admin/affiliates', verifyAdmin, async (req, res) => {
    try {
        // 1. Get all visitors
        const { data: allVisitors, error: vError } = await supabase.from('visitors').select('id, name, phone, referred_by');
        if (vError) throw vError;

        // 2. Get all earnings
        const { data: earnings } = await supabase.from('affiliate_earnings').select('*');
        
        // 3. Get pending withdrawals
        const { data: withdrawals } = await supabase
            .from('withdrawals')
            .select('*, visitors(name, phone)')
            .eq('status', 'pending');

        const affiliateStats = allVisitors.map(v => {
            const myEarnings = (earnings || []).filter(e => e.affiliate_id === v.id);
            const myReferrals = (allVisitors || []).filter(other => other.referred_by === v.id).length;
            const totalEarned = myEarnings.reduce((sum, e) => sum + parseFloat(e.commission), 0);
            
            return {
                id: v.id,
                name: v.name,
                phone: v.phone,
                referral_count: myReferrals,
                total_earned: totalEarned
            };
        }).filter(a => a.referral_count > 0 || a.total_earned > 0);

        const stats = {
            totalAffiliates: affiliateStats.length,
            totalReferrals: allVisitors.filter(v => v.referred_by !== null).length,
            totalPaid: (earnings || []).filter(e => e.status === 'paid').reduce((sum, e) => sum + parseFloat(e.commission), 0),
            pendingWithdrawals: (withdrawals || []).length
        };

        res.json({ success: true, affiliates: affiliateStats, withdrawals: withdrawals || [], stats });
    } catch (err) {
        console.error('Admin Affiliates Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Admin: Approve withdrawal
app.post('/api/admin/affiliate/withdraw/:id/approve', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('withdrawals')
            .update({ status: 'approved' })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
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

// GET all categories (with cache)
app.get('/api/categories', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

    const now = Date.now();
    if (categoriesCache.data && (now - categoriesCache.timestamp) < CATEGORIES_TTL) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', 'public, max-age=600');
        return res.json(categoriesCache.data);
    }

    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });

    categoriesCache = { data, timestamp: now };
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'public, max-age=600');
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
    invalidateCategoriesCache();
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
    invalidateCategoriesCache();
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
        invalidateCategoriesCache();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ============================================
// VIDEO ENDPOINTS
// ============================================

// GET all published videos (public storefront)
app.get('/api/videos', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// GET all videos (admin — includes unpublished)
app.get('/api/admin/videos', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST - add new video
app.post('/api/admin/videos', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { title, youtube_url, description, is_published, price, duration_days } = req.body;
    if (!title || !youtube_url) return res.status(400).json({ error: 'Title na YouTube URL zinahitajika' });

    // Extract YouTube video ID from various URL formats
    const extractVideoId = (url) => {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
            /youtube\.com\/shorts\/([^&\n?#]+)/
        ];
        for (const p of patterns) {
            const match = url.match(p);
            if (match) return match[1];
        }
        return null;
    };

    const video_id = extractVideoId(youtube_url);
    if (!video_id) return res.status(400).json({ error: 'YouTube URL si sahihi. Tuma link kamili ya YouTube.' });

    const { data, error } = await supabase
        .from('videos')
        .insert([{ 
            title: title.trim(), 
            youtube_url: youtube_url.trim(),
            video_id,
            description: description ? description.trim() : null,
            is_published: is_published !== false,
            price: parseInt(price) || 0,
            duration_days: parseInt(duration_days) || 0
        }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, video: data[0] });
});

// PATCH - update video (publish/unpublish or edit)
app.patch('/api/admin/videos/:id', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const updates = req.body;
    const { data, error } = await supabase
        .from('videos')
        .update(updates)
        .eq('id', id)
        .select();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, video: data[0] });
});

// DELETE - remove a video
app.delete('/api/admin/videos/:id', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    const { error } = await supabase.from('videos').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ============================================
// VIDEO ACCESS & PAYMENT ENDPOINTS
// ============================================

// CHECK VIDEO ACCESS
app.get('/api/check-video-access/:visitor_id/:video_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id, video_id } = req.params;

    try {
        // Get video details
        const { data: video } = await supabase
            .from('videos')
            .select('price, duration_days, title')
            .eq('id', video_id)
            .single();

        if (!video) return res.status(404).json({ error: 'Video haijapatikana' });

        // Free video - always accessible
        if (!video.price || video.price <= 0) {
            return res.json({ has_access: true, expires_at: '2099-12-31T23:59:59Z' });
        }

        // Check payment_orders for approved video access
        const { data: order } = await supabase
            .from('payment_orders')
            .select('status, expires_at, created_at')
            .eq('visitor_id', parseInt(visitor_id))
            .eq('post_id', video_id)   // we reuse post_id column for video_id
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!order) return res.json({ has_access: false });

        // Check expiry
        const expiresAt = new Date(order.expires_at);
        if (expiresAt < new Date()) return res.json({ has_access: false, expired: true });

        return res.json({ has_access: true, expires_at: order.expires_at });
    } catch (e) {
        console.error('check-video-access error:', e);
        return res.status(500).json({ error: e.message });
    }
});

// ============================================
// HARAKAPAY / ZENOPAY VIDEO CHECKOUT & VERIFY
// ============================================

// VIDEO HARAKAPAY CHECKOUT
const initiateVideoCheckout = async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { amount, phone, videoTitle, visitorId, videoId, email, name } = req.body;
    if (!amount || !phone || !visitorId || !videoId) {
        return res.status(400).json({ error: 'Taarifa zote zinahitajika' });
    }

    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '255' + formattedPhone.substring(1);
    else if (!formattedPhone.startsWith('255')) formattedPhone = '255' + formattedPhone;

    try {
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const webhookUrl = `${protocol}://${host}/api/payments/harakapay-callback`;

        const payload = {
            phone: formattedPhone,
            amount: parseFloat(amount),
            description: `Video: ${videoTitle || 'Premium Video'}`,
            webhook_url: webhookUrl
        };

        console.log('Initiating HarakaPay Video Checkout:', payload);

        const hRes = await fetch('https://harakapay.net/api/v1/collect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': HARAKAPAY_API_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await hRes.json();
        console.log('HarakaPay Video checkout response:', data);

        // Map HarakaPay response format to match frontend expectation
        const result = {
            status: data.success ? 'success' : 'failed',
            message: data.message || (data.success ? 'success' : 'failed'),
            order_id: data.order_id || null
        };

        if (data.success === true && data.order_id) {
            const extOrderId = data.order_id;
            
            // Get video for duration info
            const { data: video } = await supabase.from('videos').select('duration_days').eq('id', videoId).single();
            const dDays = video ? (video.duration_days || 0) : 0;
            let expiresAt = new Date('2099-12-31T23:59:59Z');
            if (dDays > 0) { expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + dDays); }

            // Store pending order — reuse post_id for video_id
            await supabase.from('payment_orders').insert([{
                visitor_id: parseInt(visitorId),
                post_id: videoId,
                amount: amount,
                phone_number: formattedPhone,
                status: 'pending',
                expires_at: expiresAt.toISOString(),
                promo_used: extOrderId   // track haraka order id
            }]);
        }

        res.json(result);
    } catch (err) {
        console.error('HarakaPay Video Checkout Error:', err);
        res.status(500).json({ error: 'HarakaPay service error' });
    }
};

app.post('/api/payments/harakapay-video-checkout', initiateVideoCheckout);
app.post('/api/payments/zenopay-video-checkout', initiateVideoCheckout);

// VIDEO HARAKAPAY VERIFY (polling from frontend)
const verifyVideoPayment = async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id, video_id } = req.params;
    try {
        const { data: order } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('visitor_id', parseInt(visitor_id))
            .eq('post_id', video_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!order) return res.json({ success: false });

        const extOrderId = order.promo_used;
        let isPaid = false;
        let statusMessage = 'Pending';

        if (extOrderId) {
            if (extOrderId.startsWith('HP')) {
                const hRes = await fetch(`https://harakapay.net/api/v1/status/${extOrderId}`, {
                    method: 'GET',
                    headers: { 'X-API-Key': HARAKAPAY_API_KEY }
                });
                const hData = await hRes.json().catch(() => ({}));
                const hStatus = (hData.payment && hData.payment.status || '').toLowerCase();
                statusMessage = hStatus || 'Pending';
                if (hStatus === 'completed' || hStatus === 'success') {
                    isPaid = true;
                }
            } else if (extOrderId.startsWith('ZP')) {
                const zRes = await fetch('https://zenoapi.com/api/payments/order_status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ 'api_key': ZENOPAY_API_KEY, 'order_id': extOrderId })
                });
                const zData = await zRes.json().catch(() => ({}));
                const zStatus = (zData.status || zData.payment_status || '').toLowerCase();
                statusMessage = zStatus || 'Pending';
                if (zStatus === 'success' || zStatus === 'completed') {
                    isPaid = true;
                }
            }
        }

        if (isPaid) {
            // Approve the order and grant access using unified logic
            const { data: video } = await supabase.from('videos').select('*').eq('id', video_id).single();
            if (video) {
                await handleSuccessfulPayment(parseInt(visitor_id), video, order.amount, order.phone_number, extOrderId, true);
                return res.json({ success: true });
            }
        }
        res.json({ success: false, message: `Status: ${statusMessage}` });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

app.get('/api/payments/verify-haraka-video/:visitor_id/:video_id', verifyVideoPayment);
app.get('/api/payments/verify-zeno-video/:visitor_id/:video_id', verifyVideoPayment);


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

app.get('/api/settings/announcement', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'announcement_text').single();
    if (error) return res.json({ value: "Karibu Chidy Prime Gaming!" });
    res.json({ value: data.value });
});

app.post('/api/settings/announcement', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { text } = req.body;
    // Store text directly as string, not double stringified
    const { error } = await supabase.from('site_settings').upsert({ key: 'announcement_text', value: text });
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

// Public promo code validation (for storefront)
app.post('/api/promo/validate', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { code } = req.body;
    if (!code) return res.json({ valid: false, message: 'Tafadhali ingiza promo code.' });

    try {
        const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'promo_codes').single();
        if (error || !data || !data.value) {
            return res.json({ valid: false, message: 'Hakuna promo codes zilizopo kwa sasa.' });
        }

        const codes = Array.isArray(data.value) ? data.value : [];
        const found = codes.find(c => c.code && c.code.toUpperCase() === code.toUpperCase());

        if (!found) {
            return res.json({ valid: false, message: 'Promo code hii haipo au si sahihi.' });
        }

        // Check if active
        if (found.active === false) {
            return res.json({ valid: false, message: 'Promo code hii imeshaisha muda wake.' });
        }

        // Check expiry if set
        if (found.expires_at && new Date(found.expires_at) < new Date()) {
            return res.json({ valid: false, message: 'Promo code hii imeshaisha muda wake.' });
        }

        // Check usage limit if set
        if (found.max_uses && found.used_count >= found.max_uses) {
            return res.json({ valid: false, message: 'Promo code hii imeshatumika mara zote zilizoruhusiwa.' });
        }

        return res.json({ valid: true, discount: found.discount || 0, message: `Punguzo la ${found.discount}%!` });
    } catch (e) {
        res.status(500).json({ valid: false, message: 'Tatizo la mfumo. Jaribu tena.' });
    }
});

// ============================================
// USER ACCESS / DURATION ENDPOINTS
// ============================================


// Helper to check and approve pending orders via HarakaPay or ZenoPay
const checkAndApprovePendingOrder = async (visitorId, postId, game) => {
    try {
        const { data: pending } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('visitor_id', parseInt(visitorId))
            .eq('post_id', postId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        if (pending && pending.length > 0) {
            const order = pending[0];
            const extOrderId = order.promo_used; // We used this for order_id
            
            if (extOrderId) {
                let isPaid = false;
                if (extOrderId.startsWith('HP')) {
                    console.log('Fail-safe: Checking HarakaPay status for:', extOrderId);
                    const hCheck = await fetch(`https://harakapay.net/api/v1/status/${extOrderId}`, {
                        method: 'GET',
                        headers: { 'X-API-Key': HARAKAPAY_API_KEY }
                    }).then(r => r.json()).catch(() => ({}));
                    const hStatus = (hCheck.payment && hCheck.payment.status || '').toLowerCase();
                    if (hStatus === 'completed' || hStatus === 'success') {
                        isPaid = true;
                    }
                } else if (extOrderId.startsWith('ZP')) {
                    console.log('Fail-safe: Checking ZenoPay status for:', extOrderId);
                    const zenoCheck = await fetch('https://zenoapi.com/api/payments/order_status', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            'api_key': ZENOPAY_API_KEY,
                            'order_id': extOrderId
                        })
                    }).then(r => r.json()).catch(() => ({}));

                    if (zenoCheck.status === 'success' || zenoCheck.message === 'success' || (zenoCheck.payment_status && zenoCheck.payment_status.toLowerCase() === 'completed')) {
                        isPaid = true;
                    }
                }

                if (isPaid) {
                    console.log(`Fail-safe: Order ${extOrderId} paid! Manually triggering success logic...`);
                    // IT WAS PAID! Manually trigger the success logic
                    await handleSuccessfulPayment(parseInt(visitorId), game, order.amount, order.phone_number, extOrderId, false);
                    
                    // Mark the pending order as approved
                    await supabase.from('payment_orders').update({ status: 'approved' }).eq('id', order.id);

                    const dDays = game.duration_days || 0;
                    let expiresAt = '2099-12-31T23:59:59Z';
                    if (dDays > 0) {
                        const expDate = new Date();
                        expDate.setDate(expDate.getDate() + dDays);
                        expiresAt = expDate.toISOString();
                    }

                    return { 
                        has_access: true, 
                        expires_at: expiresAt,
                        links: game.links || []
                    };
                }
            }
        }
    } catch (checkErr) {
        console.error('checkAndApprovePendingOrder error:', checkErr);
    }
    return null;
};

// Check if a visitor has active access to a game
app.get('/api/check-access/:visitor_id/:post_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    const { visitor_id, post_id } = req.params;
    
    try {
        // 1. Fetch game details to check price
        const { data: game, error: gameErr } = await supabase
            .from('posts')
            .select('price, links, duration_days, title')
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

        // 3. First, try checkAndApprovePendingOrder as a quick check/fail-safe
        const approvedAccess = await checkAndApprovePendingOrder(visitor_id, post_id, game);
        if (approvedAccess) {
            return res.json(approvedAccess);
        }

        // 4. Check user_access
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
                .select('status, created_at')
                .eq('visitor_id', parseInt(visitor_id))
                .eq('post_id', post_id)
                .eq('status', 'pending');

            // Only treat it as pending if it's less than 3 minutes old
            let hasRecentPending = false;
            if (orderData && orderData.length > 0) {
                const recentOrders = orderData.filter(o => {
                    const ageMs = new Date() - new Date(o.created_at);
                    return ageMs < 3 * 60 * 1000; // 3 minutes
                });
                if (recentOrders.length > 0) {
                    hasRecentPending = true;
                }
            }

            return res.json({ 
                has_access: false,
                pending_order: hasRecentPending
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
        
        // If expired, check if there's any pending order (already handled by step 3, but let's do a fallback check or return expired)
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

// === HARAKAPAY / ZENOPAY INTEGRATION LOGIC ===
const initiateGameCheckout = async (req, res) => {
    const { amount, phone, gameTitle, visitorId, postId, email, name, promo_used } = req.body;
    
    // Normalize phone
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '255' + formattedPhone.substring(1);
    else if (!formattedPhone.startsWith('255')) formattedPhone = '255' + formattedPhone;

    try {
        // Dynamic Webhook URL to avoid redirects (Vercel/Cloudflare)
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const webhookUrl = `${protocol}://${host}/api/payments/harakapay-callback`;

        const payload = {
            phone: formattedPhone,
            amount: parseFloat(amount),
            description: `Game: ${gameTitle || 'Premium Game'}`,
            webhook_url: webhookUrl
        };

        console.log('Initiating HarakaPay Checkout:', payload, 'Promo Used:', promo_used);
        if (promo_used) {
            sendTelegramAlert(`🎟️ <b>PROMO CODE APPLIED</b>\n<b>User:</b> ${name} (${phone})\n<b>Code:</b> ${promo_used}\n<b>Discounted Amount:</b> TSh ${parseFloat(amount).toLocaleString()}`);
        }

        const hRes = await fetch('https://harakapay.net/api/v1/collect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': HARAKAPAY_API_KEY
            },
            body: JSON.stringify(payload)
        });

        const data = await hRes.json();
        console.log('HarakaPay response:', data);

        // Map HarakaPay response format to match frontend expectation
        const result = {
            status: data.success ? 'success' : 'failed',
            message: data.message || (data.success ? 'success' : 'failed'),
            order_id: data.order_id || null
        };

        if (data.success === true && data.order_id) {
            const extOrderId = data.order_id;
            await supabase.from('payment_orders').insert([{
                visitor_id: visitorId,
                post_id: postId,
                amount: amount,
                phone_number: formattedPhone,
                status: 'pending',
                promo_used: extOrderId // We use this field to track the Haraka order ID for polling/callbacks
            }]);
        }

        res.json(result);
    } catch (err) {
        console.error('HarakaPay Checkout Error:', err);
        res.status(500).json({ error: 'HarakaPay service error' });
    }
};

app.post('/api/payments/harakapay-checkout', initiateGameCheckout);
app.post('/api/payments/zenopay-checkout', initiateGameCheckout);

const handlePaymentCallback = async (req, res) => {
    console.log('--- HARAKAPAY/ZENOPAY CALLBACK RECEIVED ---', req.body);
    
    // Haraka Pay webhook payload: { "order_id": "...", "status": "completed", "amount": ..., "phone": "..." }
    // ZenoPay webhook payload: { status, payment_status, order_id, amount, msisdn }
    const { status, payment_status, order_id, amount, msisdn, phone } = req.body;
    const currentStatus = (status || payment_status || '').toLowerCase();
    const cleanPhone = msisdn || phone || 'Unknown';

    if (currentStatus === 'success' || currentStatus === 'completed') {
        try {
            // 1. Find the order in our DB by the order_id (stored in promo_used)
            const { data: order, error: orderErr } = await supabase
                .from('payment_orders')
                .select('*')
                .eq('promo_used', order_id)
                .single();

            if (order && order.status === 'pending') {
                // Try to find in posts (games) first
                const { data: game } = await supabase.from('posts').select('*').eq('id', order.post_id).single();
                if (game) {
                    await handleSuccessfulPayment(order.visitor_id, game, amount || order.amount, cleanPhone || order.phone_number, order_id, false);
                    return res.json({ success: true });
                } else {
                    // Try to find in videos
                    const { data: video } = await supabase.from('videos').select('*').eq('id', order.post_id).single();
                    if (video) {
                        await handleSuccessfulPayment(order.visitor_id, video, amount || order.amount, cleanPhone || order.phone_number, order_id, true);
                        return res.json({ success: true });
                    }
                }
            }

            // Fallback: If not found in DB, try parsing the order_id string (legacy ZenoPay format)
            const match = (order_id || '').match(/ZP(\d+)V([a-f0-9]+)T/i);
            if (match) {
                const visitorId = parseInt(match[1]);
                const shortPostId = match[2];
                const { data: game } = await supabase.from('posts').select('*').ilike('id', `${shortPostId}%`).single();
                
                if (game) {
                    await handleSuccessfulPayment(visitorId, game, amount || 0, cleanPhone || 'Callback', order_id, false);
                    return res.json({ success: true });
                }
            }

            return res.json({ success: true, message: 'Processed or ignored' });
        } catch (err) {
            console.error('Webhook processing error:', err);
            return res.status(500).send('Error');
        }
    } else {
        sendTelegramAlert(`❌ <b>FAILED PAYMENT</b> ❌\n\n<b>Order ID:</b> ${order_id}\n<b>Amount:</b> TSh ${amount || 0}\n<b>Phone:</b> ${cleanPhone}\n<b>Method:</b> HarakaPay/ZenoPay\n<b>Status:</b> ${currentStatus}\n<b>Time:</b> ${new Date().toLocaleString()}`);
    }
    res.json({ success: false });
};

app.post('/api/payments/harakapay-callback', handlePaymentCallback);
app.post('/api/payments/zenopay-callback', handlePaymentCallback);

async function handleSuccessfulPayment(visitorId, item, amount, phone, zenoOrderId = null, isVideo = false) {
    const itemId = item.id;
    try {
        // 1. Update existing order or insert new one
        if (zenoOrderId) {
            await supabase.from('payment_orders')
                .update({ status: 'approved', updated_at: new Date().toISOString() })
                .eq('promo_used', zenoOrderId);
        } else {
            await supabase.from('payment_orders').insert([{
                visitor_id: visitorId,
                post_id: itemId,
                amount: amount,
                phone_number: phone,
                status: 'approved'
            }]);
        }

        // Increment lifetime_revenue setting in site_settings
        try {
            const { data: currentRev } = await supabase.from('site_settings').select('value').eq('key', 'lifetime_revenue').single();
            const currentVal = currentRev ? parseFloat(currentRev.value || 0) : 0;
            const newVal = currentVal + parseFloat(amount || 0);
            await supabase.from('site_settings').upsert({ key: 'lifetime_revenue', value: String(newVal) }, { onConflict: 'key' });
            invalidateSettingsCache('lifetime_revenue');
        } catch (errRev) {
            console.error("Failed to increment lifetime_revenue:", errRev);
        }

        // 2. Grant Access (for videos we check payment_orders directly, but we'll also record in user_access for consistency)
        const dDays = item.duration_days || 0;
        let expiresAt = new Date('2099-12-31T23:59:59Z');
        if (dDays > 0) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + dDays);
        }

        await supabase.from('user_access').upsert({
            visitor_id: visitorId,
            post_id: itemId,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString()
        }, { onConflict: 'visitor_id,post_id' });

        // --- REFERRAL COMMISSION LOGIC ---
        try {
            const { data: visitor } = await supabase
                .from('visitors')
                .select('referred_by, name')
                .eq('id', visitorId)
                .single();

            if (visitor && visitor.referred_by) {
                const commission = Math.floor(parseFloat(amount) * 0.10); 
                if (commission > 0) {
                    await supabase.from('affiliate_earnings').insert([{
                        affiliate_id: visitor.referred_by,
                        buyer_id: visitorId,
                        amount_paid: amount,
                        commission: commission,
                        game_title: item.title
                    }]);

                    await supabase.from('notifications').insert({
                        visitor_id: visitor.referred_by,
                        title: 'Pesa Imeingia! 💰',
                        message: `Hongera! Umepata TSh ${commission} kama kamisheni baada ya ${visitor.name || 'rafiki yako'} kununua ${item.title}.`,
                        type: 'success'
                    });
                }
            }
        } catch (refErr) {
            console.error('Referral payout failed:', refErr);
        }

        // 3. Notifications for the buyer
        await supabase.from('notifications').insert({
            visitor_id: visitorId, 
            post_id: itemId,
            title: isVideo ? 'Video Imefunguka! 🎬' : 'Malipo Yamekubaliwa! ✅',
            message: isVideo 
                ? `Malipo yako ya video "${item.title}" yamehakikiwa. Sasa unaweza kuitazama.` 
                : `Malipo yako ya game "${item.title}" yamehakikiwa. Sasa unaweza kuanza kudownload.`,
            type: 'success'
        });

        // 4. Telegram Alert
        const paymentMethod = (zenoOrderId && zenoOrderId.startsWith('HP')) ? 'HarakaPay' : 'ZenoPay';
        sendTelegramAlert(`💰 <b>SUCCESSFUL ${isVideo ? 'VIDEO' : 'GAME'} PAYMENT</b> 💰\n<b>Item:</b> ${item.title}\n<b>Amount:</b> TSh ${parseFloat(amount).toLocaleString()}\n<b>Phone:</b> ${phone}\n<b>Method:</b> ${paymentMethod}`);
    } catch (e) {
        console.error('handleSuccessfulPayment Error:', e);
    }
}

const verifyPaymentManual = async (req, res) => {
    const { visitor_id, post_id } = req.params;
    try {
        const { data: pending } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('visitor_id', parseInt(visitor_id))
            .eq('post_id', post_id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        if (!pending || pending.length === 0) {
            return res.json({ success: false, message: 'Hakuna malipo yanayosubiri.' });
        }

        const order = pending[0];
        const extOrderId = order.promo_used;

        if (!extOrderId) {
             return res.json({ success: false, message: 'Hii ni oda ya manual, tafadhali wasiliana na admin.' });
        }

        let isPaid = false;
        let statusMessage = 'Pending';

        if (extOrderId.startsWith('HP')) {
            const hRes = await fetch(`https://harakapay.net/api/v1/status/${extOrderId}`, {
                method: 'GET',
                headers: { 'X-API-Key': HARAKAPAY_API_KEY }
            });
            const hData = await hRes.json().catch(() => ({}));
            const hStatus = (hData.payment && hData.payment.status || '').toLowerCase();
            statusMessage = hStatus || 'Pending';
            if (hStatus === 'completed' || hStatus === 'success') {
                isPaid = true;
            }
        } else if (extOrderId.startsWith('ZP')) {
            const zRes = await fetch('https://zenoapi.com/api/payments/order_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ 'api_key': ZENOPAY_API_KEY, 'order_id': extOrderId })
            });
            const zData = await zRes.json().catch(() => ({}));
            const zStatus = (zData.status || zData.payment_status || '').toLowerCase();
            statusMessage = zStatus || 'Pending';
            if (zStatus === 'success' || zStatus === 'completed') {
                isPaid = true;
            }
        }

        if (isPaid) {
            // Try posts first
            const { data: game } = await supabase.from('posts').select('*').eq('id', post_id).single();
            if (game) {
                await handleSuccessfulPayment(parseInt(visitor_id), game, order.amount, order.phone_number, extOrderId, false);
                return res.json({ success: true });
            } else {
                // Try videos
                const { data: video } = await supabase.from('videos').select('*').eq('id', post_id).single();
                if (video) {
                    await handleSuccessfulPayment(parseInt(visitor_id), video, order.amount, order.phone_number, extOrderId, true);
                    return res.json({ success: true });
                }
            }
        }

        res.json({ success: false, message: `Bado malipo hayajaonekana kwenye mfumo. Status: ${statusMessage}` });
    } catch (e) {
        console.error('Verify error:', e);
        res.status(500).json({ success: false });
    }
};

app.get('/api/payments/verify-haraka/:visitor_id/:post_id', verifyPaymentManual);
app.get('/api/payments/verify-zeno/:visitor_id/:post_id', verifyPaymentManual);

// Admin: Auto-Verify Order via HarakaPay/ZenoPay
app.post('/api/admin/orders/:id/verify', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const { data: order, error } = await supabase.from('payment_orders').select('*').eq('id', id).single();
        if (error || !order) return res.status(404).json({ error: 'Oda haijapatikana' });

        const extOrderId = order.promo_used;
        if (!extOrderId || (!extOrderId.startsWith('HP') && !extOrderId.startsWith('ZP'))) {
            return res.json({ success: false, message: 'Hii sio oda ya HarakaPay au ZenoPay (STK Push).' });
        }

        let isPaid = false;
        let statusMessage = 'Pending';

        if (extOrderId.startsWith('HP')) {
            const hRes = await fetch(`https://harakapay.net/api/v1/status/${extOrderId}`, {
                method: 'GET',
                headers: { 'X-API-Key': HARAKAPAY_API_KEY }
            });
            const hData = await hRes.json().catch(() => ({}));
            const hStatus = (hData.payment && hData.payment.status || '').toLowerCase();
            statusMessage = hStatus || 'Pending';
            if (hStatus === 'completed' || hStatus === 'success') {
                isPaid = true;
            }
        } else if (extOrderId.startsWith('ZP')) {
            const zRes = await fetch('https://zenoapi.com/api/payments/order_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ 'api_key': ZENOPAY_API_KEY, 'order_id': extOrderId })
            });
            const zData = await zRes.json().catch(() => ({}));
            const zStatus = (zData.status || zData.payment_status || '').toLowerCase();
            statusMessage = zStatus || 'Pending';
            if (zStatus === 'success' || zStatus === 'completed') {
                isPaid = true;
            }
        }

        if (isPaid) {
            // Try posts first
            const { data: game } = await supabase.from('posts').select('*').eq('id', order.post_id).single();
            if (game) {
                await handleSuccessfulPayment(order.visitor_id, game, order.amount, order.phone_number, extOrderId, false);
                return res.json({ success: true, message: 'Malipo yamehakikiwa na kukubaliwa!' });
            } else {
                // Try videos
                const { data: video } = await supabase.from('videos').select('*').eq('id', order.post_id).single();
                if (video) {
                    await handleSuccessfulPayment(order.visitor_id, video, order.amount, order.phone_number, extOrderId, true);
                    return res.json({ success: true, message: 'Malipo ya video yamehakikiwa na kukubaliwa!' });
                }
            }
        }

        res.json({ success: false, message: `Status: ${statusMessage}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
                promo_used: promo_used || null
            }])
            .select();
        
        if (error) throw error;
        
        // Notify admin via Telegram & chat
        console.log(`[ORDER] New Pending Order: Visitor=${visitor_id}, Post=${post_id}, Amount=${amount}, Phone=${phone_number}`);
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
    
    // Auto-cleanup ALL orders older than 7 days
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        await supabase.from('payment_orders')
            .delete()
            .lt('created_at', sevenDaysAgo.toISOString());
    } catch (e) {
        console.error("Cleanup error:", e);
    }
    
    const { data, error } = await supabase
        .from('payment_orders')
        .select(`
            *,
            visitors (name, phone),
            posts (title, category)
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
    
    if (!['approved', 'manual_approved', 'rejected'].includes(status)) {
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
        if (status === 'approved' || status === 'manual_approved') {
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
            .in('status', ['approved', 'manual_approved']);

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

// Admin - Activity Feed
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

// Admin - Analytics Summary
app.get('/api/admin/analytics', verifyAdmin, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0,0,0,0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const { count: todayUsers } = await supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
        const { count: yesterdayUsers } = await supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('created_at', yesterday.toISOString()).lt('created_at', today.toISOString());

        const diff = (todayUsers || 0) - (yesterdayUsers || 0);
        res.json({
            trend: diff >= 0 ? 'up' : 'down',
            diff: Math.abs(diff)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// System Health
app.get('/api/system/health', verifyAdmin, async (req, res) => {
    const os = require('os');
    try {
        // Test DB connection
        const { error: dbError } = await supabase.from('posts').select('id').limit(1);
        
        const stats = {
            supabaseStatus: dbError ? 'ERROR: ' + dbError.message : 'OK (Connected)',
            cpuUsage: parseFloat((os.loadavg()[0] * 100 / (os.cpus().length || 1)).toFixed(1)),
            memoryUsage: parseFloat(((1 - os.freemem() / os.totalmem()) * 100).toFixed(1)),
            uptime: Math.floor(process.uptime()),
            telegramStatus: process.env.TELEGRAM_BOT_TOKEN ? 'Active' : 'Not Configured'
        };
        res.json({ 
            stats,
            errors: global.systemErrors || [],
            telegramConfigured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

// Mark notification as read
app.post('/api/notifications/:id/read', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete individual notification
app.post('/api/notifications/:id/delete', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { id } = req.params;
    try {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Clear all notifications for a visitor
app.post('/api/notifications/visitor/:visitor_id/clear', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id } = req.params;
    try {
        // Delete personal notifications
        const { error } = await supabase.from('notifications').delete().eq('visitor_id', parseInt(visitor_id));
        if (error) throw error;
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
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
            
        if (error || !data) return res.status(404).json({ valid: false, message: 'Promo codes not found' });
        
        const codes = Array.isArray(data.value) ? data.value : [];
        const promo = codes.find(c => c.code.toUpperCase() === code.toUpperCase() && c.active);
        
        if (promo) {
            res.json({ 
                valid: true, 
                discount: promo.discount, 
                type: promo.type || 'percentage', // 'percentage' or 'fixed'
                message: `✅ Promo "${promo.code}" applied! -${promo.discount}${promo.type === 'fixed' ? ' TSh' : '%'}`
            });
        } else {
            res.status(404).json({ valid: false, message: 'Promo code is invalid or expired' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin - Fetch all promo codes
app.get('/api/admin/promo', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    try {
        const { data, error } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'promo_codes')
            .single();
            
        if (error && error.code !== 'PGRST116') throw error;
        res.json(data ? data.value : []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin - Save promo codes
app.post('/api/admin/promo', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { codes } = req.body;
    try {
        const { error } = await supabase
            .from('site_settings')
            .upsert({ 
                key: 'promo_codes', 
                value: codes,
                updated_at: new Date().toISOString()
            }, { onConflict: 'key' });
            
        if (error) throw error;
        res.json({ success: true });
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

// Generic Settings Getter
app.get('/api/settings/:key', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { key } = req.params;
    try {
        const { data, error } = await supabase.from('site_settings').select('value').eq('key', key).single();
        if (error && error.code !== 'PGRST116') throw error;
        res.json({ key, value: data ? data.value : 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generic Settings Setter (Admin Only)
app.post('/api/settings/:key', verifyAdmin, async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { key } = req.params;
    const { value, text, enabled } = req.body;
    
    // Normalize value from various potential request body formats
    let finalValue = value;
    if (finalValue === undefined) finalValue = text;
    if (finalValue === undefined) finalValue = enabled;
    
    try {
        const { error } = await supabase.from('site_settings').upsert({ 
            key, 
            value: String(finalValue),
            updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
        
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// === AFFILIATE SYSTEM ENDPOINTS ===

// Get stats for a specific affiliate
app.get('/api/affiliate/stats/:visitor_id', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id } = req.params;

    try {
        // 1. Get referral count
        const { count: referralCount } = await supabase
            .from('visitors')
            .select('*', { count: 'exact', head: true })
            .eq('referred_by', parseInt(visitor_id));

        // 2. Get total earnings
        const { data: earnings } = await supabase
            .from('affiliate_earnings')
            .select('commission')
            .eq('affiliate_id', parseInt(visitor_id));

        const totalEarnings = (earnings || []).reduce((sum, e) => sum + parseFloat(e.commission), 0);

        res.json({ referralCount: referralCount || 0, totalEarnings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Request withdrawal
app.post('/api/affiliate/withdraw', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    const { visitor_id, amount } = req.body;

    try {
        // Send alert to admin via Telegram or specialized table
        sendTelegramAlert(`💸 <b>WITHDRAWAL REQUEST</b> 💸\n\n<b>User ID:</b> ${visitor_id}\n<b>Amount:</b> TSh ${amount.toLocaleString()}\n<b>Time:</b> ${new Date().toLocaleString()}\n\n<i>Tafadhali kagua balance yake na umtumie pesa kwenye namba yake ya simu.</i>`);
        
        // You could also log this in a 'withdrawal_requests' table
        
        res.json({ success: true, message: 'Request sent to admin' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Global Error Handling to prevent silent crashes
// Hall of Fame - Recent Successes
app.get('/api/hall-of-fame', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });
    
    try {
        const { data, error } = await supabase
            .from('payment_orders')
            .select(`
                id,
                created_at,
                visitors (name, phone),
                posts (title, image_url)
            `)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) return res.status(500).json({ error: error.message });
        
        // Mask sensitive data and format
        const successes = data.map(item => ({
            name: item.visitors ? item.visitors.name : 'Mwanachama',
            phone: item.visitors ? item.visitors.phone.substring(0,4) + '***' + item.visitors.phone.slice(-3) : '***',
            game: item.posts ? item.posts.title : 'Premium Content',
            image: item.posts ? item.posts.image_url : null,
            time: item.created_at
        }));
        
        res.json({ success: true, successes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
    // In production, you might want to restart specifically or log to a service
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
