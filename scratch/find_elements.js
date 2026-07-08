const fs = require('fs');
const path = require('path');

const adminHtmlPath = path.join(__dirname, '..', 'views', 'admin.html');
const code = fs.readFileSync(adminHtmlPath, 'utf8');

// Let's find some keywords like "Upload", "Game", "Input", etc.
console.log('File size:', code.length);

const lines = code.split('\n');
console.log('Total lines:', lines.length);

// Search for lines and print matches
function findMatches(keyword) {
    console.log(`=== Matches for "${keyword}": ===`);
    lines.forEach((line, idx) => {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
            console.log(`${idx + 1}: ${line.trim()}`);
        }
    });
}

findMatches('Upload');
findMatches('Trailer');
findMatches('URL');
findMatches('YouTube');
