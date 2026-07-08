const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'views', 'admin.html');
const code = fs.readFileSync(adminPath, 'utf8');
const lines = code.split('\n');

function findMatches(keyword) {
    console.log(`=== Matches for "${keyword}": ===`);
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    });
}

findMatches('uploadForm');
findMatches('editForm');
findMatches('newGame');
