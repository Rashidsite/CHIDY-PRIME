const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'views', 'admin.html');
const code = fs.readFileSync(adminPath, 'utf8');
const lines = code.split('\n');

lines.forEach((line, idx) => {
    if (line.includes('form.') || line.includes('uploadForm') || line.includes('form.addEventListener')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
