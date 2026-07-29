const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../views/admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const lines = html.split('\n');

lines.forEach((line, idx) => {
    if (/vaultOverlay/i.test(line) || /vault-unlocked/i.test(line) || /checkPIN/i.test(line) || /unlockVault/i.test(line) || /pin/i.test(line)) {
        console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
});
