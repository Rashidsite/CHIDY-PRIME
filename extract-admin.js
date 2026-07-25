const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.join(__dirname, 'views', 'admin.html'), 'utf8');

// Find all script tags
const scripts = [];
const regex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
while ((match = regex.exec(content)) !== null) {
    if (match[1].trim()) {
        scripts.push(match[1]);
    }
}

console.log(`Found ${scripts.length} embedded javascript scripts in views/admin.html.`);

const keywords = ['login', 'auth', 'pin', 'token', 'fetchItem', 'orders', 'games', 'settings', '/api/admin/'];

scripts.forEach((script, index) => {
    const lines = script.split('\n');
    const matchedLines = [];
    lines.forEach((line, lineNo) => {
        const hasKeyword = keywords.some(k => line.toLowerCase().includes(k.toLowerCase()));
        if (hasKeyword) {
            matchedLines.push({ lineNo: lineNo + 1, content: line.trim() });
        }
    });

    if (matchedLines.length > 0) {
        console.log(`\n--- Script Block #${index + 1} (${lines.length} lines total) matches: ---`);
        const sampleSize = 30; // print first 30 matches
        matchedLines.slice(0, sampleSize).forEach(m => {
            console.log(`Line ${m.lineNo}: ${m.content}`);
        });
        if (matchedLines.length > sampleSize) {
            console.log(`... and ${matchedLines.length - sampleSize} more matching lines`);
        }
    }
});
