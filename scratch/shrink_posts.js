const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

const newCSS = `
            /* Post Size Reduction (Compact Mode) */
            .categories-container, .game-grid {
                grid-template-columns: repeat(3, 1fr) !important; /* 3 items per row on mobile to make them smaller */
                gap: 8px !important;
                padding: 5px !important;
            }
            .game-card {
                padding: 6px !important;
                border-radius: 10px !important;
            }
            .card-image-wrap {
                height: 90px !important;
            }
            .card-title {
                font-size: 0.65rem !important;
                margin-top: 5px !important;
            }
            .game-meta, .game-category {
                font-size: 0.5rem !important;
            }
            .card-actions a, .card-actions button {
                padding: 4px 6px !important;
                font-size: 0.6rem !important;
            }
`;

// Insert the new CSS right after the `@media (max-width: 768px) {` line we added before
if (content.includes('@media (max-width: 768px) {') && !content.includes('Post Size Reduction (Compact Mode)')) {
    content = content.replace('@media (max-width: 768px) {', '@media (max-width: 768px) {' + newCSS);
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('Successfully shrunk posts for mobile view.');
} else {
    console.log('Could not find the injection point or already injected.');
}
