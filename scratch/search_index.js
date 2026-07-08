const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'views', 'index.html');
const code = fs.readFileSync(indexPath, 'utf8');

const lines = code.split('\n');

function findMatches(keyword) {
    console.log(`=== Matches for "${keyword}": ===`);
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    });
}

findMatches('youtube');
findMatches('modal');
findMatches('detail');
findMatches('showGameDetails');
findMatches('openGame');
