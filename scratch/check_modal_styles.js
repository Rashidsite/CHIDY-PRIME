const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../views/admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const lines = html.split('\n');

console.log('=== Checking all modals and overlays in admin.html ===');
lines.forEach((line, idx) => {
    if (line.includes('class="modal-overlay"') || line.includes('id="editVideoOverlay"') || line.includes('id="userDetailModal"') || line.includes('id="confirmModal"')) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
