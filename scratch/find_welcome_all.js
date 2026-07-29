const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../views/admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const lines = html.split('\n');

console.log('=== ALL REFERENCES TO welcomeSequence in admin.html ===');
lines.forEach((line, idx) => {
    if (line.includes('welcomeSequence')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
