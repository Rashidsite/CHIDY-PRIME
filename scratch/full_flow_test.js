// Full signup flow test - simulates exactly what browser does
const http = require('http');

async function makeRequest(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const bodyStr = body ? JSON.stringify(body) : null;
        const options = {
            hostname: 'localhost',
            port: 3000,
            path,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch(e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

async function runFullTest() {
    console.log('='.repeat(50));
    console.log('🧪 CHIDY PRIME - FULL SIGNUP + PURCHASE TEST');
    console.log('='.repeat(50));

    // STEP 1: Check maintenance
    console.log('\n📋 STEP 1: Checking maintenance mode...');
    try {
        const res = await makeRequest('/api/settings/maintenance');
        console.log(`   Status: ${res.status}, Value: "${res.body.value}"`);
        if (res.body.value === 'true') {
            console.log('   ⚠️  MAINTENANCE IS ON! Site will show "System Upgrade" to users!');
        } else {
            console.log('   ✅ Maintenance OFF - site is live');
        }
    } catch(e) { console.log('   ❌ Failed:', e.message); }

    // STEP 2: Signup
    console.log('\n📋 STEP 2: Signing up new user...');
    let visitorId = null;
    try {
        const signupRes = await makeRequest('/api/signup', 'POST', {
            name: 'Kaka Test',
            phone: '0787654321',
            referred_by: null
        });
        console.log(`   Status: ${signupRes.status}`);
        if (signupRes.body.success) {
            visitorId = signupRes.body.visitor.id;
            console.log(`   ✅ Signup SUCCESS! Visitor ID: ${visitorId}, Name: ${signupRes.body.visitor.name}`);
        } else {
            console.log(`   ❌ Signup FAILED: ${signupRes.body.error}`);
        }
    } catch(e) { console.log('   ❌ Connection error:', e.message); }

    if (!visitorId) {
        console.log('\n❌ Cannot continue - signup failed');
        return;
    }

    // STEP 3: Verify user exists
    console.log('\n📋 STEP 3: Verifying user in DB (what browser does after signup)...');
    try {
        const checkRes = await makeRequest(`/api/check-user/${visitorId}`);
        console.log(`   Status: ${checkRes.status}`);
        if (checkRes.body.exists) {
            console.log('   ✅ User verified in DB - signup overlay would HIDE correctly');
        } else {
            console.log('   ❌ User NOT found - signup overlay would REAPPEAR! BUG!');
        }
    } catch(e) { console.log('   ❌ Connection error:', e.message); }

    // STEP 4: Load games
    console.log('\n📋 STEP 4: Loading games (what appears after signup)...');
    try {
        const gamesRes = await makeRequest('/api/games');
        console.log(`   Status: ${gamesRes.status}`);
        if (Array.isArray(gamesRes.body) && gamesRes.body.length > 0) {
            console.log(`   ✅ ${gamesRes.body.length} games loaded!`);
            console.log('   First game:', gamesRes.body[0].title, '- TSh', gamesRes.body[0].price?.toLocaleString());
            
            // STEP 5: Click on first game
            const game = gamesRes.body[0];
            console.log(`\n📋 STEP 5: Opening game "${game.title}"...`);
            const accessRes = await makeRequest(`/api/check-access/${visitorId}/${game.id}`);
            console.log(`   Access check status: ${accessRes.status}`);
            if (accessRes.body.has_access) {
                console.log('   ✅ Already has access!');
            } else {
                console.log('   💰 No access - payment needed');
                console.log(`   Price: TSh ${game.price?.toLocaleString()}`);
            }
        } else {
            console.log('   ⚠️  No games loaded or error:', JSON.stringify(gamesRes.body).substring(0, 100));
        }
    } catch(e) { console.log('   ❌ Connection error:', e.message); }

    // STEP 6: User stats
    console.log('\n📋 STEP 6: Loading user stats (sidebar profile)...');
    try {
        const statsRes = await makeRequest(`/api/user/stats/${visitorId}`);
        console.log(`   Status: ${statsRes.status}`);
        if (statsRes.body.error) {
            console.log('   ⚠️  Stats error:', statsRes.body.error);
        } else {
            console.log('   ✅ Stats loaded:', JSON.stringify(statsRes.body).substring(0, 100));
        }
    } catch(e) { console.log('   ❌ Connection error:', e.message); }

    console.log('\n' + '='.repeat(50));
    console.log('🏁 TEST COMPLETE');
    console.log('='.repeat(50));
}

runFullTest().catch(console.error);
