const fs = require('fs');
const content = fs.readFileSync('views/index.html', 'utf-8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('modal') || lines[i].includes('MODAL')) {
        console.log(`Line ${i}: ${lines[i].trim()}`);
    }
}
