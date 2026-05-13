// Open browser with pre-logged-in user to bypass signup
const http = require('http');
const { exec } = require('child_process');

// First create a real visitor
const body = JSON.stringify({ name: 'Chidy Demo', phone: '0799999999' });
const options = {
    hostname: 'localhost', port: 3000, path: '/api/signup', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
};

console.log('Creating demo visitor...');
const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const result = JSON.parse(data);
        if (result.success) {
            const visitor = result.visitor;
            const stored = JSON.stringify({ id: visitor.id, name: visitor.name, phone: visitor.phone });
            console.log(`✅ Visitor created: ${visitor.name} (ID: ${visitor.id})`);
            
            // Open browser with localStorage pre-set via URL with a special debug param
            const url = `http://localhost:3000`;
            console.log(`\n📋 Copy this to browser console to bypass signup:\n`);
            console.log(`localStorage.setItem('chidy_visitor', '${stored}'); location.reload();`);
            console.log(`\n🌐 Or open: ${url}`);
            
            // Open browser automatically  
            exec(`start chrome "${url}"`, (err) => {
                if (err) exec(`start msedge "${url}"`);
            });
        } else {
            console.log('Error:', result.error);
        }
    });
});
req.on('error', e => console.error('Error:', e.message));
req.write(body);
req.end();
