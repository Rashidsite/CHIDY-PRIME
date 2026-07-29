/**
 * WhatsApp Business AI Assistant Engine for Chidy Prime
 * -------------------------------------------------------
 * Supports TWO gateway modes:
 *  MODE 1 (QR Scan - Recommended): UltraMsg.com or Green-API.com
 *  MODE 2 (Official Meta Cloud API): Meta WhatsApp Business Platform
 *
 * Auto-detects which gateway is configured from .env and uses it.
 */

const https = require('https');

function initWhatsAppAI(app, supabase) {
    // ─── GATEWAY MODE DETECTION ───────────────────────────────────────────────
    const ULTRAMSG_TOKEN      = process.env.ULTRAMSG_TOKEN || '';
    const ULTRAMSG_INSTANCE   = process.env.ULTRAMSG_INSTANCE || ''; // e.g. "instance12345"

    const GREENAPI_INSTANCE   = process.env.GREENAPI_INSTANCE || '';
    const GREENAPI_TOKEN      = process.env.GREENAPI_TOKEN || '';

    // Meta Cloud API (Mode 2 - Official)
    const VERIFY_TOKEN        = process.env.WHATSAPP_VERIFY_TOKEN || 'chidy_prime_wa_verify_2026';
    const META_ACCESS_TOKEN   = process.env.WHATSAPP_ACCESS_TOKEN || '';
    const META_PHONE_ID       = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

    // AI Engine Keys (optional - improves responses)
    const OPENAI_API_KEY  = process.env.OPENAI_API_KEY || '';
    const GEMINI_API_KEY  = process.env.GEMINI_API_KEY || '';

    // Detect active mode
    const MODE = ULTRAMSG_TOKEN && ULTRAMSG_INSTANCE ? 'ULTRAMSG'
               : GREENAPI_INSTANCE && GREENAPI_TOKEN ? 'GREENAPI'
               : META_ACCESS_TOKEN && META_PHONE_ID  ? 'META'
               : 'SIMULATION';

    console.log(`📱 WhatsApp AI Assistant: Mode = ${MODE}`);
    if (MODE === 'SIMULATION') {
        console.warn('⚠️  No WhatsApp gateway configured. Running in LOG-ONLY mode.');
        console.warn('   Add ULTRAMSG_TOKEN + ULTRAMSG_INSTANCE to .env to go live.');
    }

    // ─── WEBHOOK VERIFICATION (for Meta / UltraMsg callback check) ───────────
    app.get('/api/whatsapp/webhook', (req, res) => {
        const mode      = req.query['hub.mode'];
        const token     = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ WhatsApp Webhook Verified');
            return res.status(200).send(challenge);
        }
        // Also respond OK for UltraMsg/Green-API health pings
        res.status(200).json({ status: 'Chidy Prime WhatsApp AI is ONLINE ✅' });
    });

    // ─── INCOMING MESSAGE RECEIVER ────────────────────────────────────────────
    app.post('/api/whatsapp/webhook', async (req, res) => {
        res.status(200).send('EVENT_RECEIVED'); // Acknowledge fast

        try {
            const body = req.body;
            if (!body) return;

            let incomingMsg = null;
            let senderPhone = null;
            let senderName  = 'Mteja';

            // ── 1. UltraMsg Format ────────────────────────────────────────────
            // POST body: { data: { from: "255712345678@c.us", body: "Habari" }, ... }
            if (body.data && body.data.body && body.data.from) {
                // Only handle real text messages (ignore status, read receipts)
                if (body.event_type && body.event_type !== 'message_received') return;
                incomingMsg  = body.data.body;
                senderPhone  = body.data.from.replace('@c.us', '').replace('@g.us', '');
                senderName   = body.data.pushname || body.data.notifyName || 'Mteja';
            }

            // ── 2. Green-API Format ───────────────────────────────────────────
            // POST body: { body: { messageData: { textMessageData: { textMessage: "..." } }, senderData: {...} } }
            else if (body.body && body.body.messageData && body.body.senderData) {
                const msgData = body.body.messageData;
                const sender  = body.body.senderData;
                if (msgData.textMessageData && msgData.textMessageData.textMessage) {
                    incomingMsg  = msgData.textMessageData.textMessage;
                    senderPhone  = sender.sender ? sender.sender.replace('@c.us', '') : '';
                    senderName   = sender.senderName || 'Mteja';
                }
            }

            // ── 3. Meta WhatsApp Cloud API Format ─────────────────────────────
            else if (body.object === 'whatsapp_business_account' && body.entry) {
                for (const entry of body.entry) {
                    for (const change of (entry.changes || [])) {
                        const value = change.value;
                        if (value && value.messages && value.messages.length > 0) {
                            const msg = value.messages[0];
                            if (msg.type === 'text' && msg.text) {
                                incomingMsg = msg.text.body;
                                senderPhone = msg.from;
                                if (value.contacts && value.contacts[0]) {
                                    senderName = value.contacts[0].profile?.name || 'Mteja';
                                }
                            }
                        }
                    }
                }
            }

            // ── 4. Admin test simulation format ───────────────────────────────
            else if (body.message && body.from) {
                incomingMsg = body.message;
                senderPhone = body.from;
                senderName  = body.name || 'Admin Test';
            }

            if (!incomingMsg || !senderPhone) return;

            // Skip group messages
            if (senderPhone.includes('@g.us')) return;

            console.log(`💬 [${MODE}] From ${senderPhone} (${senderName}): "${incomingMsg}"`);

            // Generate AI reply from store knowledge base
            const reply = await generateStoreAIResponse(incomingMsg, senderPhone, senderName, supabase);

            // Send reply via the correct gateway
            await sendWhatsAppMessage(senderPhone, reply);

        } catch (err) {
            console.error('❌ WhatsApp webhook error:', err.message);
        }
    });

    // ─── ADMIN DIRECT SEND ENDPOINT ───────────────────────────────────────────
    app.post('/api/whatsapp/send', async (req, res) => {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ error: 'Phone na message vinahitajika' });
        }
        const ok = await sendWhatsAppMessage(phone, message);
        if (ok) {
            res.json({ success: true, message: 'Ujumbe umetumwa!' });
        } else {
            res.status(500).json({ error: 'Imeshindwa kutuma WhatsApp — angalia server logs' });
        }
    });

    // ─── ADMIN STATUS ENDPOINT ────────────────────────────────────────────────
    app.get('/api/admin/whatsapp/status', (req, res) => {
        res.json({
            mode:       MODE,
            configured: MODE !== 'SIMULATION',
            aiEngine:   OPENAI_API_KEY ? 'OpenAI GPT-4o' : GEMINI_API_KEY ? 'Google Gemini AI' : 'Chidy Prime Neural Store AI',
            ultramsg:   !!ULTRAMSG_TOKEN,
            greenapi:   !!GREENAPI_INSTANCE,
            meta:       !!META_ACCESS_TOKEN,
        });
    });

    // ─── CORE AI RESPONSE ENGINE ──────────────────────────────────────────────
    async function generateStoreAIResponse(query, phone, name, db) {
        const q = query.toLowerCase().trim();
        let catalog = [], orders = [], settings = {};

        // 1. Fetch live data from Supabase
        try {
            if (db) {
                const { data: games } = await db
                    .from('games')
                    .select('id, title, category, price, is_free, download_url, description')
                    .eq('status', 'published')
                    .limit(60);
                catalog = games || [];

                const digits = phone.replace(/\D/g, '').slice(-9);
                if (digits.length >= 9) {
                    const { data: ord } = await db
                        .from('payment_orders')
                        .select('order_id, phone_number, game_title, amount, status, download_url, created_at')
                        .ilike('phone_number', `%${digits}%`)
                        .order('created_at', { ascending: false })
                        .limit(5);
                    orders = ord || [];
                }

                const { data: sData } = await db.from('site_settings').select('*');
                if (sData) sData.forEach(s => settings[s.key] = s.value);
            }
        } catch (e) {
            console.error('WhatsApp AI DB error:', e.message);
        }

        // 2. Try External AI (Gemini preferred, then OpenAI) if key exists
        if (GEMINI_API_KEY || OPENAI_API_KEY) {
            try {
                const systemPrompt = buildSystemPrompt(name, query, catalog, orders, settings);
                if (GEMINI_API_KEY) {
                    const r = await callGemini(GEMINI_API_KEY, systemPrompt);
                    if (r) return r;
                } else {
                    const r = await callOpenAI(OPENAI_API_KEY, systemPrompt);
                    if (r) return r;
                }
            } catch (e) {
                console.warn('External AI call failed, using Neural fallback:', e.message);
            }
        }

        // 3. Built-in Chidy Prime Neural Store AI (works without any API keys)
        return builtInAI(q, name, catalog, orders, settings);
    }

    function buildSystemPrompt(name, query, catalog, orders, settings) {
        const games_list = catalog
            .slice(0, 30)
            .map(g => `• ${g.title} | ${g.category} | ${g.is_free ? 'BURE' : 'Tzs ' + Number(g.price).toLocaleString()}`)
            .join('\n');

        const orders_list = orders.length > 0
            ? orders.map(o => `• ${o.game_title}: ${o.status.toUpperCase()} | ${o.status === 'approved' ? o.download_url || 'Link tayari kwenye site' : 'Inasubiri'}`).join('\n')
            : 'Hakuna orders zilizoonekana kwa namba hii.';

        return `Wewe ni msaidizi wa AI wa Chidy Prime, duka nambari 1 la games Tanzania.
Jina la mteja: ${name}
Je, wazungumze Kiswahili kwa urafiki, na utumie emoji zinazolingana 🎮🔥.
Jibu liwe fupi (si zaidi ya mistari 10) na la moja kwa moja.

GAMES ZILIZOPO DUKANI (${catalog.length} jumla):
${games_list}

DISCOUNT YA SASA: ${settings['global_discount'] ? settings['global_discount'] + '%' : 'Hakuna'}
TANGAZO LA DUKA: ${settings['announcement'] || 'Hakuna'}

HISTORIA YA ORDERS YA MTEJA HUYU:
${orders_list}

SWALI LA MTEJA: "${query}"

Jibu swali hilo moja kwa moja kwa Kiswahili. Kama ni order, mwambie status. 
Kama anatafuta game, mwambie bei na link: https://www.chidyprime.com`;
    }

    function builtInAI(q, name, catalog, orders, settings) {
        // Salamu
        if (q.match(/^(habari|hujambo|mambo|sasa|vipi|hey|halo|salamu|hi|hello)/)) {
            let msg = `Habari ${name}! 👋 Karibu Chidy Prime — Hub Nambari 1 ya Games Tanzania! 🎮🔥\n\n`;
            if (settings['announcement']) msg += `📢 *${settings['announcement']}*\n\n`;
            if (settings['global_discount'] && parseInt(settings['global_discount']) > 0) {
                msg += `🔥 *OFFER:* Pata ${settings['global_discount']}% DISCOUNT kwenye games zote leo!\n\n`;
            }
            msg += `Niambie unataka nini:\n• Jina la game (mfano: *GTA V*, *FIFA 24*)\n• Aina (*PPSSPP*, *Android*, *PC*)\n• Angalia order yako\n\n🌐 https://www.chidyprime.com`;
            return msg;
        }

        // Order / Malipo check
        if (q.match(/order|malipo|link|download|pakua|oda|imeisha|nimelipia|nililipia|nimelipa/)) {
            if (orders.length > 0) {
                const o = orders[0];
                if (o.status === 'approved') {
                    return `✅ Habari ${name}!\n\n*${o.game_title}* — Malipo yamekubaliwa!\n\n📥 *Download Link*:\n${o.download_url || '🔗 https://www.chidyprime.com (ingia na namba yako)'}\n\nAsante! 🎮`;
                }
                if (o.status === 'pending') {
                    return `⏳ Habari ${name}!\n\nOrder yako ya *${o.game_title}* (Tzs ${Number(o.amount).toLocaleString()}) bado inakaguliwa.\n\nMfumo wetu unathibitisha malipo yako otomatikal — subiri dakika chache! 🔄\n\nHata hivyo, angalia status: https://www.chidyprime.com`;
                }
                return `⚠️ Habari ${name}!\n\nOrder ya *${o.game_title}* ilionyesha tatizo la malipo.\n\nTafadhali jaribu tena au wasiliana nasi: https://www.chidyprime.com`;
            }
            return `Habari ${name}! 👋\n\nSikuona order zilizohusiana na namba yako kwenye mfumo wetu.\n\nTafadhali hakikisha unatumia namba ile ile uliyotumia kulipa, au tembelea: https://www.chidyprime.com`;
        }

        // Game category searches
        const catMap = {
            ppsspp: 'PPSSPP', psp: 'PPSSPP',
            android: 'ANDROID', simu: 'ANDROID',
            pc: 'PC', computer: 'PC', kompyuta: 'PC',
            ps4: 'PS4', ps5: 'PS5', playstation: 'PS4',
            xbox: 'XBOX',
        };
        for (const [keyword, cat] of Object.entries(catMap)) {
            if (q.includes(keyword)) {
                const matched = catalog.filter(g => g.category?.toUpperCase().includes(cat));
                let msg = `🎮 *${cat} Games* zilizoko Chidy Prime:\n\n`;
                (matched.length > 0 ? matched : catalog).slice(0, 5).forEach(g => {
                    msg += `• *${g.title}* — ${g.is_free ? 'BURE 🎁' : 'Tzs ' + Number(g.price).toLocaleString()}\n`;
                });
                msg += `\n🔗 Tazama zote: https://www.chidyprime.com`;
                return msg;
            }
        }

        // Specific game name search
        const matched = catalog.filter(g =>
            g.title.toLowerCase().includes(q) || q.includes(g.title.toLowerCase().split(' ')[0])
        );
        if (matched.length > 0) {
            let msg = `Habari ${name}! 🎮 Nilikupata hizi:\n\n`;
            matched.slice(0, 4).forEach(g => {
                msg += `*${g.title}*\n• Aina: ${g.category}\n• Bei: ${g.is_free ? 'BURE 🎁' : 'Tzs ' + Number(g.price).toLocaleString()}\n\n`;
            });
            msg += `🔗 Nunua au Pakua: https://www.chidyprime.com 🔥`;
            return msg;
        }

        // Bei / Price general
        if (q.match(/bei|shilling|ngapi|price|cost|tsh|tzs/)) {
            const sample = catalog.filter(g => !g.is_free).slice(0, 5);
            let msg = `💰 Bei za Games Chidy Prime:\n\n`;
            sample.forEach(g => { msg += `• *${g.title}* — Tzs ${Number(g.price).toLocaleString()}\n`; });
            msg += `\nGame nyingine ziko BURE kabisa! 🎁\n🌐 https://www.chidyprime.com`;
            return msg;
        }

        // Default fallback
        return `Habari ${name}! 🎮 Karibu Chidy Prime!\n\nNiambie:\n• Jina la game unalotaka\n• Aina ya game (PPSSPP / Android / PC)\n• Angalia order yako\n\n🌐 https://www.chidyprime.com\n🔥 Games bora zaidi Tanzania!`;
    }

    // ─── GATEWAY SEND FUNCTIONS ────────────────────────────────────────────────
    async function sendWhatsAppMessage(phone, text) {
        // Clean phone: remove non-digits, ensure starts with country code
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '255' + cleanPhone.slice(1);
        if (!cleanPhone.startsWith('255') && cleanPhone.length === 9) cleanPhone = '255' + cleanPhone;

        if (MODE === 'ULTRAMSG')  return sendViaUltraMsg(cleanPhone, text);
        if (MODE === 'GREENAPI')  return sendViaGreenAPI(cleanPhone, text);
        if (MODE === 'META')      return sendViaMeta(cleanPhone, text);

        // Simulation mode - just log
        console.log(`[WA-SIM] To: +${cleanPhone}\n${text}\n${'─'.repeat(60)}`);
        return true;
    }

    async function sendViaUltraMsg(phone, text) {
        const payload = JSON.stringify({ token: ULTRAMSG_TOKEN, to: phone, body: text });
        return httpsPost(`api.ultramsg.com`, `/v1/${ULTRAMSG_INSTANCE}/messages/chat`, payload, {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        });
    }

    async function sendViaGreenAPI(phone, text) {
        const chatId = phone + '@c.us';
        const payload = JSON.stringify({ chatId, message: text });
        return httpsPost(
            `api.green-api.com`,
            `/waInstance${GREENAPI_INSTANCE}/sendMessage/${GREENAPI_TOKEN}`,
            payload,
            { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        );
    }

    async function sendViaMeta(phone, text) {
        const payload = JSON.stringify({
            messaging_product: 'whatsapp', recipient_type: 'individual',
            to: phone, type: 'text',
            text: { preview_url: false, body: text }
        });
        return httpsPost(`graph.facebook.com`, `/v19.0/${META_PHONE_ID}/messages`, payload, {
            'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        });
    }

    function httpsPost(host, path, payload, headers) {
        return new Promise((resolve) => {
            const req = https.request({ hostname: host, port: 443, path, method: 'POST', headers }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        console.log(`✅ WA Message sent (${host})`);
                        resolve(true);
                    } else {
                        console.error(`❌ WA Gateway Error [${res.statusCode}]:`, data.slice(0, 200));
                        resolve(false);
                    }
                });
            });
            req.on('error', e => { console.error('❌ WA Network Error:', e.message); resolve(false); });
            req.write(payload);
            req.end();
        });
    }

    // ─── EXTERNAL AI HELPERS ──────────────────────────────────────────────────
    async function callGemini(key, prompt) {
        const p = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
        return new Promise(resolve => {
            const req = https.request({
                hostname: 'generativelanguage.googleapis.com', port: 443,
                path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
            }, res => {
                let d = ''; res.on('data', c => d += c);
                res.on('end', () => {
                    try {
                        const j = JSON.parse(d);
                        resolve(j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null);
                    } catch { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.write(p); req.end();
        });
    }

    async function callOpenAI(key, prompt) {
        const p = JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: prompt }], temperature: 0.7 });
        return new Promise(resolve => {
            const req = https.request({
                hostname: 'api.openai.com', port: 443,
                path: '/v1/chat/completions', method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(p) }
            }, res => {
                let d = ''; res.on('data', c => d += c);
                res.on('end', () => {
                    try {
                        const j = JSON.parse(d);
                        resolve(j?.choices?.[0]?.message?.content?.trim() || null);
                    } catch { resolve(null); }
                });
            });
            req.on('error', () => resolve(null));
            req.write(p); req.end();
        });
    }
}

module.exports = { initWhatsAppAI };
