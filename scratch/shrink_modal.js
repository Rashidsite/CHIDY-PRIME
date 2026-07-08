const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../views/index.html');
let content = fs.readFileSync(indexPath, 'utf-8');

const shrinkModalCSS = `
    <!-- SHRINK GAME MODAL ON MOBILE -->
    <style>
        @media (max-width: 768px) {
            .detail-image {
                height: 160px !important;
                aspect-ratio: auto !important;
                object-fit: cover !important;
            }
            .detail-body {
                padding: 15px !important;
            }
            .detail-body h2 {
                font-size: 1.1rem !important;
                margin-bottom: 10px !important;
                line-height: 1.3 !important;
            }
            .detail-card {
                max-height: 80vh !important;
            }
            .detail-meta {
                margin-bottom: 12px !important;
            }
            .detail-meta span {
                font-size: 0.65rem !important;
                padding: 4px 8px !important;
            }
        }
    </style>
</head>
`;

if (!content.includes('SHRINK GAME MODAL ON MOBILE')) {
    content = content.replace('</head>', shrinkModalCSS);
    fs.writeFileSync(indexPath, content, 'utf-8');
    console.log('Successfully shrunk the game modal.');
} else {
    console.log('Modal already shrunk.');
}
