const fs = require('fs');
const lines = fs.readFileSync('views/index.html', 'utf-8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Premium Profile Card in Sidebar') || lines[i].includes('s-profile-card')) {
        console.log(lines.slice(Math.max(0, i-2), i+30).join('\n'));
        break; 
    }
}
