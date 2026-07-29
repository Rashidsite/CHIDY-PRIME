const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../views/admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const lines = html.split('\n');

const dupNames = ['loadStoreSettings', 'saveGlobalDiscount', 'clearGlobalDiscount', 'refreshAllData', 'toggleSidebar'];

dupNames.forEach(funcName => {
    console.log(`=== Function: ${funcName} ===`);
    lines.forEach((line, idx) => {
        if (new RegExp(`function\\s+${funcName}\\s*\\(`).test(line)) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        }
    });
});
