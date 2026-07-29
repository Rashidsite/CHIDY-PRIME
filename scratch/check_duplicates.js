const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '../views/admin.html'), 'utf8');
const lines = html.split('\n');

// Check for duplicate function definitions - this causes overriding issues
const fnMatches = {};
lines.forEach((line, idx) => {
    const m = line.match(/(?:async\s+)?function\s+(\w+)\s*\(|(?:window\.|var |let |const )?(\w+)\s*=\s*(?:async\s+)?function/);
    if (m) {
        const name = m[1] || m[2];
        if (!name) return;
        if (!fnMatches[name]) fnMatches[name] = [];
        fnMatches[name].push(idx + 1);
    }
});

// Find duplicates
console.log('=== DUPLICATE FUNCTION DEFINITIONS ===');
let hasDupes = false;
Object.entries(fnMatches).forEach(([name, lines]) => {
    if (lines.length > 1) {
        hasDupes = true;
        console.log(`⚠️  ${name}: defined ${lines.length}x at lines [${lines.join(', ')}]`);
    }
});
if (!hasDupes) console.log('None found');

// Now check for editGame which is called but not defined
console.log('\n=== LINES CALLING editGame ===');
lines.forEach((line, idx) => {
    if (line.includes('editGame')) {
        console.log(`Line ${idx+1}: ${line.trim().substring(0, 150)}`);
    }
});

// Check loadStoreSettings - it's defined twice which is suspicious
console.log('\n=== loadStoreSettings - check both definitions ===');
lines.forEach((line, idx) => {
    if (line.includes('loadStoreSettings') && idx >= 4640 && idx <= 4670) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
    if (line.includes('loadStoreSettings') && idx >= 5640 && idx <= 5680) {
        console.log(`Line ${idx+1}: ${line.trim()}`);
    }
});
