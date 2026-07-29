const fs = require('fs');
const path = require('path');

const adminHtml = fs.readFileSync(path.join(__dirname, '../views/admin.html'), 'utf8');
const lines = adminHtml.split('\n');

function printRange(start, end, label) {
    console.log(`\n=================== ${label} (Lines ${start}-${end}) ===================`);
    for (let i = start - 1; i < end && i < lines.length; i++) {
        console.log(`${i+1}: ${lines[i]}`);
    }
}

printRange(2170, 2250, 'verifyPin & unlockVault');
printRange(4585, 4630, 'vault lock / error handling');
printRange(4795, 4840, 'initial load / DOMContentLoaded check 1');
printRange(7525, 7565, 'initial load / DOMContentLoaded check 2');
