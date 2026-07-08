const fs = require('fs');
const content = fs.readFileSync('views/index.html', 'utf-8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('refreshUserStats')) {
        if (lines[i].includes('function refreshUserStats')) {
            console.log(`Found at line ${i+1}:`);
            console.log(lines.slice(i, i+40).join('\n'));
        }
    }
}
