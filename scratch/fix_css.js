const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

// Fix the body transform bug which breaks position:fixed (like the header and modals)
content = content.replace('body, .categories-container, .game-card {', '.game-card {');

fs.writeFileSync(indexPath, content, 'utf-8');
console.log('Fixed CSS transform bug in views/index.html');
