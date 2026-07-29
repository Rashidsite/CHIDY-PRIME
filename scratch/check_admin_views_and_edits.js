const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../views/admin.html');
const html = fs.readFileSync(htmlPath, 'utf8');

console.log('=== Searching for edit functions and modal overlay display in admin.html ===');

const lines = html.split('\n');

lines.forEach((line, idx) => {
    if (
        /editGame/i.test(line) ||
        /openEditModal/i.test(line) ||
        /openEditVideo/i.test(line) ||
        /editModal/i.test(line) ||
        /pointer-events/i.test(line) ||
        /showView/i.test(line)
    ) {
        if (line.length < 200) {
            console.log(`Line ${idx + 1}: ${line.trim()}`);
        } else {
            console.log(`Line ${idx + 1}: ${line.trim().substring(0, 140)}...`);
        }
    }
});
