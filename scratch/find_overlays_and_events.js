const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../views/admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const lines = html.split('\n');

console.log('=== Fixed/Absolute elements & overlays in admin.html ===');

let currentBlock = '';
lines.forEach((line, idx) => {
    if (line.includes('position: fixed') || line.includes('position:fixed') || line.includes('z-index')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
