// Test signup endpoint directly
const http = require('http');

const body = JSON.stringify({ name: 'Rashid Test', phone: '0712345678', referred_by: null });

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/signup',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
    }
};

console.log('Testing signup...');
const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        try {
            const parsed = JSON.parse(data);
            if (parsed.success) {
                console.log('\n✅ SIGNUP WORKS! Visitor ID:', parsed.visitor?.id);
                console.log('Name:', parsed.visitor?.name);
            } else {
                console.log('\n❌ SIGNUP FAILED:', parsed.error);
            }
        } catch(e) {
            console.log('Raw response:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Connection error:', e.message);
    console.log('Server might not be running on port 3000');
});

req.write(body);
req.end();
