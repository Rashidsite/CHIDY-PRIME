const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, '..', 'server.js');
const code = fs.readFileSync(serverPath, 'utf8');

const lines = code.split('\n');

function findMatches(keyword) {
    console.log(`=== Matches for "${keyword}": ===`);
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    });
}

findMatches('youtube_url');
findMatches('games');
