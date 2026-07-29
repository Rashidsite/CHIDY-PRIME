const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../views/admin.html'), 'utf8');
const lines = html.split('\n');

// Find script tags
let scriptDepth = 0;
const scriptBlocks = [];
let inScript = false;
let scriptStart = -1;

lines.forEach((line, idx) => {
    if (/<script[\s>]/i.test(line) && !/<\/script>/i.test(line)) {
        if (!inScript) {
            inScript = true;
            scriptStart = idx + 1;
        }
    }
    if (/<\/script>/i.test(line)) {
        if (inScript) {
            scriptBlocks.push({ start: scriptStart, end: idx + 1 });
            inScript = false;
        }
    }
});

console.log('=== Script blocks ===');
scriptBlocks.forEach((b, i) => console.log(`Script ${i+1}: lines ${b.start}-${b.end} (${b.end - b.start + 1} lines)`));

// Check where the duplicate functions are
console.log('\n=== Duplicate functions: which script block? ===');
const dupes = {
    'loadStoreSettings': [4649, 5656],
    'saveGlobalDiscount': [4727, 5722],
    'clearGlobalDiscount': [4748, 5753],
    'toggleSidebar': [5295, 6785],
    'showView': [6831, 6850]
};

Object.entries(dupes).forEach(([fn, lineNums]) => {
    lineNums.forEach(ln => {
        const block = scriptBlocks.find(b => ln >= b.start && ln <= b.end);
        console.log(`  ${fn} at line ${ln}: ${block ? `Script ${scriptBlocks.indexOf(block)+1} (${block.start}-${block.end})` : 'NOT IN A SCRIPT BLOCK'}`);
    });
});
