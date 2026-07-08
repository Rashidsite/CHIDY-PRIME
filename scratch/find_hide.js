const fs = require('fs');
const lines = fs.readFileSync('views/index.html', 'utf-8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('sidebar-user-card') && lines[i].includes('display')) {
        console.log(`Line ${i}: ${lines[i]}`);
    }
}
