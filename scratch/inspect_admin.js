const fs = require('fs');
const path = require('path');

const adminHtml = fs.readFileSync(path.join(__dirname, '../views/admin.html'), 'utf8');

console.log('=== Inspecting admin.html ===');

// Check overlays, z-indexes, pointer-events: none, display: none
const overlays = [];
const lines = adminHtml.split('\n');
lines.forEach((line, idx) => {
    if (line.includes('overlay') || line.includes('vault') || line.includes('pin-modal') || line.includes('pointer-events')) {
        if (line.length < 300) {
            overlays.push(`Line ${idx+1}: ${line.trim()}`);
        }
    }
});
console.log('--- Overlays / Vault / Pointer events lines ---');
console.log(overlays.slice(0, 30).join('\n'));

// Check how views are rendered/hidden
console.log('\n--- View elements in admin.html ---');
lines.forEach((line, idx) => {
    if (line.includes('id="view-') || line.includes('id="') && line.includes('-view"')) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});

// Check checkAdminAuth or Vault check logic in JS
console.log('\n--- Searching Auth / Vault logic in JS ---');
lines.forEach((line, idx) => {
    if (line.includes('checkAuth') || line.includes('vault') || line.includes('PIN') || line.includes('verifyPin') || line.includes('adminToken') || line.includes('admin_token')) {
        if (line.length < 200) {
            console.log(`Line ${idx+1}: ${line.trim()}`);
        }
    }
});
